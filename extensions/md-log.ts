/**
 * md-log — mirror the session to a markdown file for comfortable reading.
 *
 * Designed for long teaching/learning sessions where the terminal is hard on
 * the eyes and markdown/math/code don't render. The linked .md file is meant
 * to be viewed rendered (e.g. in Obsidian), so assistant text with $...$ math,
 * code blocks, and markdown all render natively — no rendering work here.
 *
 * Captures only reading-relevant content:
 *   - user prompts
 *   - assistant text (lesson prose)
 *   - quiz / ask_user_question Q&A blocks
 * Other tools (bash, read, write, edit, ...) are omitted.
 *
 * Quiz/ask questions are written BEFORE the user answers (on tool_call), so the
 * reader sees the question appear live; the answer + feedback are appended on
 * tool_result. The question block NEVER contains the correct answer or
 * explanation (the user reads this file live).
 *
 * quiz answers are typed free text, so the quiz tool can't grade them and the
 * answer block lands ungraded, titled with QUIZ_PENDING_TITLE. The agent grades
 * the answer with `quiz_grade`, and that result patches the pending title into a
 * graded one (success/warning/failure) in place. So the file is append-only
 * except for that one header line per quiz.
 *
 * Commands:
 *   /md-log <filepath>  — Link a markdown file and backfill the session.
 *   /md-unlog           — Stop logging.
 *
 * No send-back-to-agent functionality (that lived in the old .md-link extension
 * this was modeled on).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const QA_TOOLS = new Set(["quiz", "ask_user_question"]);

// Title of a quiz answer block that is waiting for the agent's grade, and the
// exact first line it produces. This extension writes the marker itself, so
// `quiz_grade` has an exact anchor to patch rather than a guessed one.
const QUIZ_PENDING_TITLE = "Quiz — answered";
const QUIZ_PENDING_HEADER = `> [!question] ${QUIZ_PENDING_TITLE}`;

function gradeHeader(verdict: string): string {
	const type = verdict === "correct" ? "success" : verdict === "partial" ? "warning" : "failure";
	const label = verdict === "correct" ? "correct ✓" : verdict === "partial" ? "partly right ~" : "incorrect ✗";
	return `> [!${type}] Quiz — ${label}`;
}

// One-line grade note inserted under the patched header. Flattened to a single
// line so it can't break the callout's `> ` prefixing.
function gradeNote(assessment: string | undefined): string {
	if (!assessment) return "";
	const flat = assessment.split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
	return flat ? `\n> Grade: ${flat}` : "";
}

export default function mdLog(pi: ExtensionAPI) {
	let logFile: string | null = null;

	// --- State restoration on session restart ---

	pi.on("session_start", async (_event, ctx) => {
		let lastLinkData: { file: string | null } | undefined;
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === "md-log") {
				lastLinkData = entry.data as { file: string | null } | undefined;
			}
		}
		if (lastLinkData?.file) {
			logFile = lastLinkData.file;
			const theme = ctx.ui.theme;
			ctx.ui.setStatus(
				"md-log",
				theme.fg("accent", "🗒 ") + theme.fg("dim", path.basename(logFile)),
			);
		}
	});

	// --- Serialization: events can fire close together; keep appends ordered ---

	let writeLock: Promise<void> = Promise.resolve();
	function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
		const prev = writeLock;
		let release: () => void;
		writeLock = new Promise<void>((r) => {
			release = r;
		});
		return prev.then(fn).finally(() => release!());
	}

	function appendToFile(text: string): void {
		if (!logFile) return;
		try {
			let current = "";
			if (fs.existsSync(logFile)) {
				current = fs.readFileSync(logFile, "utf-8");
			}
			const prefix = current.trim().length > 0 ? "\n\n" : "";
			fs.writeFileSync(logFile, current + prefix + text + "\n", "utf-8");
		} catch {
			// File may have been deleted externally; ignore.
		}
	}

	// --- Formatting ---

	function callout(type: string, title: string, bodyLines: string[]): string {
		const lines = [`> [!${type}] ${title}`];
		for (const line of bodyLines) {
			lines.push(line.length === 0 ? ">" : `> ${line}`);
		}
		return lines.join("\n");
	}

	function userBlock(text: string): string {
		return `> [!quote] YOU\n\n${text}`;
	}

	// Skill declarations (`<skill name="..." ...> ...whole SKILL.md... </skill>`)
	// are system-injected context, not user prose. Replace each with a compact
	// callout noting the skill was loaded, so the log keeps the signal without
	// the noise. Runs on already-trimmed text.
	function stripSkillBlocks(text: string): string {
		return text.replace(
			/<skill\b([^>]*)>[\s\S]*?<\/skill>/g,
			(_match, attrs: string) => {
				const name = /name="([^"]+)"/.exec(attrs)?.[1];
				return `> [!note] SKILL loaded: ${name ?? "(unknown)"}`;
			},
		);
	}

	function assistantBlock(text: string): string {
		return `> [!abstract] PI\n\n${text}`;
	}

	function optionsList(options: Array<{ label: string }>): string[] {
		return options.map((o, i) => `${i + 1}. ${o.label}`);
	}

	function questionCallout(label: string, question: string, context: string | undefined, options: Array<{ label: string }>): string {
		const body: string[] = [];
		for (const line of question.split("\n")) body.push(line);
		if (context) {
			body.push("");
			for (const line of context.split("\n")) body.push(line);
		}
		if (options.length > 0) {
			body.push("");
			body.push(...optionsList(options));
		}
		return callout("question", label, body);
	}

	function answerCalloutQuiz(details: any): string {
		const status = details?.status;
		if (status === "cancelled") {
			return callout("warning", "Quiz — cancelled", ["(user skipped)"]);
		}
		if (status === "unavailable") {
			return callout("warning", "Quiz — unavailable", [details?.message || ""]);
		}
		// "I don't know" is neither correct nor incorrect — it's a distinct signal,
		// so it never renders as a red ✗ and never waits for a grade.
		const dontKnow = details?.dontKnow === true;
		const body: string[] = [];

		if (dontKnow) {
			body.push("Your answer: I don't know");
		} else {
			body.push("Your answer:");
			for (const line of String(details?.answer || "(no answer)").split("\n")) body.push(line);
		}

		if (details?.correctAnswer) {
			body.push("");
			body.push("Reference answer:");
			for (const line of String(details.correctAnswer).split("\n")) body.push(line);
		}

		if (details?.explanation) {
			body.push("");
			for (const line of String(details.explanation).split("\n")) body.push(line);
		}

		// A typed answer can't be graded here, so it lands under the pending title
		// and `quiz_grade` patches it. "I don't know" is already final.
		return dontKnow
			? callout("question", "Quiz — I don't know", body)
			: callout("question", QUIZ_PENDING_TITLE, body);
	}

	// Patch the most recent pending quiz header into a graded one. The anchor is a
	// marker this extension wrote itself, so the match is exact; when it's absent
	// (logging started mid-question, the quiz was an "I don't know", or a grade
	// arrived twice) this is a no-op rather than an error.
	//
	// lastIndexOf, not indexOf, and the choice is a deliberate trade. Grading is
	// meant to be one-at-a-time (quiz, grade, quiz, grade), and while it is, both
	// behave identically. They differ only once that is violated, and neither is
	// safe in every case:
	//   - Two quizzes pending at once: oldest-first grades them in the order they
	//     were asked and gets both right; newest-first swaps the two verdicts.
	//   - A quiz that never gets graded: newest-first ignores the stale block for
	//     good, since later grades always match something newer; oldest-first
	//     attaches every future verdict to the stale block and stays one behind
	//     forever.
	// The second violation is the likelier one (a skipped call, an interrupted
	// session), and it degrades far worse: a run of confidently wrong ✓/✗ marks in
	// the lesson log is more damaging than one visibly ungraded block. So take the
	// failure that omits a verdict over the one that silently misattributes it.
	function applyGradeToFile(verdict: string, assessment: string | undefined): void {
		if (!logFile) return;
		try {
			const current = fs.readFileSync(logFile, "utf-8");
			const at = current.lastIndexOf(QUIZ_PENDING_HEADER);
			if (at === -1) return;
			const replacement = gradeHeader(verdict) + gradeNote(assessment);
			fs.writeFileSync(
				logFile,
				current.slice(0, at) + replacement + current.slice(at + QUIZ_PENDING_HEADER.length),
				"utf-8",
			);
		} catch {
			// File may have been deleted externally; ignore.
		}
	}

	// Same patch against an in-memory block list, for the backfill path.
	function applyGradeToBlocks(blocks: string[], verdict: string, assessment: string | undefined): void {
		for (let i = blocks.length - 1; i >= 0; i--) {
			if (blocks[i].startsWith(QUIZ_PENDING_HEADER)) {
				blocks[i] = gradeHeader(verdict) + gradeNote(assessment) + blocks[i].slice(QUIZ_PENDING_HEADER.length);
				return;
			}
		}
	}

	function answerCalloutAsk(details: any): string {
		const status = details?.status;
		if (status === "cancelled") {
			return callout("warning", "Question — cancelled", ["(user skipped)"]);
		}
		if (status === "unavailable") {
			return callout("warning", "Question — unavailable", [details?.message || ""]);
		}
		const answers: any[] = details?.answers || [];
		const body: string[] = answers.map((a) => {
			if (a.type === "other") return `Other: ${a.label}`;
			if (a.type === "text") return a.label;
			return `${a.index}. ${a.label}`;
		});
		if (body.length === 0) body.push("(no answer)");
		return callout("example", "Answer", body);
	}

	// --- Event handlers ---

	pi.on("message_end", async (event, _ctx) => {
		if (!logFile) return;
		const msg = event.message;
		if (!msg || !("role" in msg)) return;

		if (msg.role === "user") {
			const text = typeof msg.content === "string"
				? msg.content
				: Array.isArray(msg.content)
					? msg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
					: "";
			const trimmed = stripSkillBlocks(text.trim());
			if (!trimmed) return;
			await withLock(() => appendToFile(userBlock(trimmed)));
			return;
		}

		if (msg.role === "assistant") {
			const textParts = (msg.content || [])
				.filter((c: any) => c.type === "text")
				.map((c: any) => (c.text as string).trim())
				.filter((t: string) => t.length > 0);
			if (textParts.length === 0) return;
			await withLock(() => appendToFile(assistantBlock(textParts.join("\n\n"))));
			return;
		}
		// toolResult messages are handled by the tool_result event (for QA tools).
	});

	// Neither tool reorders anything before display any more (quiz answers are
	// typed, so it has no options to shuffle), which means the tool_call args are
	// already exactly what the user sees — safe to write the question live,
	// before they answer.
	pi.on("tool_call", async (event, _ctx) => {
		if (!logFile) return;
		const toolName = (event as any).toolName;
		if (!QA_TOOLS.has(toolName)) return;
		const input = (event as any).input || {};
		const question: string = input.question || "";
		const context: string | undefined = input.details?.trim() || undefined;
		// Only ask_user_question offers options; a quiz is answered by typing.
		const options: Array<{ label: string }> =
			toolName === "ask_user_question" && Array.isArray(input.options) ? input.options : [];
		const label = toolName === "quiz" ? "Quiz" : "Question";
		const block = questionCallout(label, question, context, options);
		await withLock(() => appendToFile(block));
	});

	pi.on("tool_result", async (event, _ctx) => {
		if (!logFile) return;
		const toolName = (event as any).toolName;
		const details = (event as any).details;

		// quiz_grade carries the agent's verdict for the answer block already in
		// the file, so it patches that block instead of appending one.
		if (toolName === "quiz_grade") {
			const verdict = details?.verdict;
			if (!verdict) return;
			await withLock(() => applyGradeToFile(verdict, details?.assessment));
			return;
		}

		if (!QA_TOOLS.has(toolName)) return;
		const block = toolName === "quiz"
			? answerCalloutQuiz(details)
			: answerCalloutAsk(details);
		await withLock(() => appendToFile(block));
	});

	// --- Commands ---

	pi.registerCommand("md-log", {
		description: "Mirror the session to a markdown file (backfills history)",
		handler: async (args, ctx: any) => {
			const filepath = args.trim();
			if (!filepath) {
				ctx.ui.notify("Usage: /md-log <filepath>", "warning");
				return;
			}
			if (typeof ctx.isIdle === "function" && !ctx.isIdle()) {
				ctx.ui.notify("Wait for the agent to finish before linking.", "warning");
				return;
			}

			const resolved = path.isAbsolute(filepath) ? filepath : path.resolve(ctx.cwd, filepath);

			// The file must already exist — /md-log links into an existing note,
			// it never creates one. This avoids silently scattering new files
			// (and parent directories) around the vault from a typo'd path.
			if (!fs.existsSync(resolved)) {
				ctx.ui.notify(`File does not exist: ${resolved}`, "error");
				return;
			}
			if (!fs.statSync(resolved).isFile()) {
				ctx.ui.notify(`Not a file: ${resolved}`, "error");
				return;
			}

			logFile = resolved;
			pi.appendEntry("md-log", { file: resolved });

			// Backfill the active branch.
			const written = backfill(ctx);

			const theme = ctx.ui.theme;
			ctx.ui.setStatus(
				"md-log",
				theme.fg("accent", "🗒 ") + theme.fg("dim", path.basename(resolved)),
			);
			ctx.ui.notify(`Linked: ${resolved} (${written} entries backfilled)`, "success");
		},
	});

	pi.registerCommand("md-unlog", {
		description: "Stop mirroring the session to a markdown file",
		handler: async (_args, ctx) => {
			if (!logFile) {
				ctx.ui.notify("No file linked", "warning");
				return;
			}
			const name = path.basename(logFile);
			logFile = null;
			pi.appendEntry("md-log", { file: null });
			ctx.ui.setStatus("md-log", undefined);
			ctx.ui.notify(`Unlinked: ${name}`, "info");
		},
	});

	// --- Backfill ---

	function backfill(ctx: any): number {
		if (!logFile) return 0;
		const entries: any[] = ctx.sessionManager.getEntries();
		if (entries.length === 0) return 0;

		const byId = new Map<string, any>();
		for (const e of entries) if (e.id) byId.set(e.id, e);

		// Active leaf = last entry that has an id (skip the session header).
		let leaf: any = null;
		for (let i = entries.length - 1; i >= 0; i--) {
			if (entries[i].id) {
				leaf = entries[i];
				break;
			}
		}
		if (!leaf) return 0;

		// Walk parent chain to root.
		const chain: any[] = [];
		let cur: any = leaf;
		const seen = new Set<string>();
		while (cur && cur.id && !seen.has(cur.id)) {
			seen.add(cur.id);
			chain.push(cur);
			cur = cur.parentId ? byId.get(cur.parentId) : null;
		}
		chain.reverse();

		// Track tool-call args from assistant messages so we can pair with results.
		const toolCallArgs = new Map<string, { name: string; args: any }>();

		const blocks: string[] = [];
		let count = 0;
		for (const entry of chain) {
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (!msg || !("role" in msg)) continue;
			count++;

			if (msg.role === "user") {
				const text = typeof msg.content === "string"
					? msg.content
					: Array.isArray(msg.content)
						? msg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
						: "";
				const trimmed = stripSkillBlocks(text.trim());
				if (trimmed) blocks.push(userBlock(trimmed));
				continue;
			}

			if (msg.role === "assistant") {
				// Index tool calls for later pairing.
				for (const c of msg.content || []) {
					if (c.type === "toolCall" && QA_TOOLS.has(c.name)) {
						toolCallArgs.set(c.id, { name: c.name, args: c.arguments });
					}
				}
				const textParts = (msg.content || [])
					.filter((c: any) => c.type === "text")
					.map((c: any) => (c.text as string).trim())
					.filter((t: string) => t.length > 0);
				if (textParts.length > 0) blocks.push(assistantBlock(textParts.join("\n\n")));
				continue;
			}

			if (msg.role === "toolResult") {
				// A grade refers back to the quiz answer block already emitted, so it
				// patches that block rather than adding one of its own.
				if (msg.toolName === "quiz_grade") {
					const verdict = msg.details?.verdict;
					if (verdict) applyGradeToBlocks(blocks, verdict, msg.details?.assessment);
					continue;
				}
				if (!QA_TOOLS.has(msg.toolName)) continue;
				const tc = toolCallArgs.get(msg.toolCallId);
				if (tc) {
					const a = tc.args || {};
					const label = tc.name === "quiz" ? "Quiz" : "Question";
					// Only ask_user_question has options; a quiz is answered by typing.
					const options = tc.name === "ask_user_question" && Array.isArray(a.options) ? a.options : [];
					blocks.push(questionCallout(label, a.question || "", a.details?.trim() || undefined, options));
				}
				if (msg.toolName === "quiz") {
					blocks.push(answerCalloutQuiz(msg.details));
				} else {
					blocks.push(answerCalloutAsk(msg.details));
				}
				continue;
			}
		}

		if (blocks.length > 0) {
			try {
				fs.writeFileSync(logFile, blocks.join("\n\n") + "\n", "utf-8");
			} catch {
				// ignore
			}
		}
		return count;
	}
}
