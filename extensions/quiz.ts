import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	Text,
	matchesKey,
	truncateToWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

// ────────────────────────────────────────────────────────────────────────────
// quiz — a free-response sibling of ask_user_question.
//
// Where ask_user_question collects a preference or decision with no notion of
// right or wrong, `quiz` poses a question that HAS a correct answer. The user
// TYPES the answer from recall. There are no options to pick from, for two
// reasons: a picked option can be right by luck, and it yields one bit of
// signal, while what the user writes shows which parts of the idea they hold,
// which words they reach for, and where the model is thin.
//
// Because a typed answer cannot be string-matched against a reference answer
// honestly, this tool does NOT grade. It reveals the reference answer and the
// explanation the moment the user submits, so feedback is still instant, and
// returns the answer verbatim to the agent. The agent reads it, grades it, and
// records the verdict with the `quiz_grade` tool — that call is what gives the
// md-log Obsidian entry its ✓/✗.
//
// "I don't know" is always available and is a distinct signal rather than a
// wrong answer, so an honest gap is never confused with a bad guess. It needs
// no grade call.
// ────────────────────────────────────────────────────────────────────────────

type QuizStatus = "answered" | "cancelled" | "unavailable";
type QuizVerdict = "correct" | "partial" | "incorrect";

// What the TUI component hands back. `answer` is the verbatim typed text and is
// absent when the user said "I don't know".
interface QuizResponse {
	dontKnow: boolean;
	answer?: string;
}

interface QuizResultDetails {
	status: QuizStatus;
	question: string;
	context?: string;
	answer?: string; // verbatim typed answer; absent when dontKnow
	correctAnswer?: string; // the reference answer, revealed after submitting
	dontKnow?: boolean; // user declined to attempt rather than guessing
	explanation?: string;
	message?: string;
}

interface QuizGradeDetails {
	verdict: QuizVerdict;
	assessment?: string;
}

const DONT_KNOW_LABEL = "I don't know";

const QuizParams = Type.Object({
	question: Type.String({
		description: "The single quiz question to ask. Ask exactly one question per tool call.",
	}),
	details: Type.Optional(
		Type.String({ description: "Optional extra context or instructions shown under the question." }),
	),
	correctAnswer: Type.String({
		description:
			"REQUIRED. The reference answer, revealed to the user as soon as they submit. Write the answer you are looking for in full prose — the user's wording will differ, so this is what you grade their typed answer against, not a string to match exactly. State everything a complete answer must contain, so a partial answer is easy to spot.",
	}),
	explanation: Type.String({
		description:
			"REQUIRED. Explanation revealed AFTER the user answers, alongside the reference answer. Use it to reinforce why the correct answer is correct.",
	}),
});

const QuizGradeParams = Type.Object({
	verdict: Type.Union(
		[Type.Literal("correct"), Type.Literal("partial"), Type.Literal("incorrect")],
		{
			description:
				'Your grade for the answer the user just typed. "correct" — they had the whole idea, wording aside. "partial" — a real piece of it, with something material missing or muddled. "incorrect" — they did not have it, or held a misconception.',
		},
	),
	assessment: Type.Optional(
		Type.String({
			description:
				"One short sentence naming exactly what they had and what was missing. Written into the lesson log next to the verdict, so keep it specific: what part of the idea was solid, what wasn't.",
		}),
	),
});

function createEditorTheme(theme: any): EditorTheme {
	return {
		borderColor: (s) => theme.fg("accent", s),
		selectList: {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		},
	};
}

function addWrapped(lines: string[], text: string, width: number, indent = ""): void {
	const contentWidth = Math.max(1, width - indent.length);
	for (const line of wrapTextWithAnsi(text, contentWidth)) {
		lines.push(truncateToWidth(`${indent}${line}`, width));
	}
}

function buildStructuredResult(
	status: QuizStatus,
	question: string,
	answer: string | undefined,
	correctAnswer: string | undefined,
	explanation: string | undefined,
	context?: string,
	message?: string,
	dontKnow?: boolean,
): QuizResultDetails {
	return { status, question, context, answer, correctAnswer, dontKnow, explanation, message };
}

function cancelledResult(question: string, correctAnswer: string, context?: string) {
	const message = "User cancelled the quiz";
	return {
		content: [{ type: "text" as const, text: message }],
		details: buildStructuredResult("cancelled", question, undefined, correctAnswer, undefined, context, message),
	};
}

function unavailableResult(question: string, message: string, correctAnswer: string, context?: string) {
	return {
		content: [{ type: "text" as const, text: message }],
		details: buildStructuredResult("unavailable", question, undefined, correctAnswer, undefined, context, message),
	};
}

function buildResult(
	question: string,
	context: string | undefined,
	response: QuizResponse,
	correctAnswer: string,
	explanation: string,
) {
	const { dontKnow, answer } = response;

	let text: string;
	if (dontKnow) {
		// Make the signal explicit for the agent: the user did NOT guess, so this
		// is a genuine knowledge gap, not a wrong answer to correct against. There
		// is nothing to grade, so no quiz_grade call is wanted.
		text = `User selected "${DONT_KNOW_LABEL}" — they did not attempt an answer (a genuine knowledge gap, not a wrong guess). Nothing to grade, so do not call quiz_grade.`;
		text += `\nReference answer: ${correctAnswer}`;
	} else {
		text = "User typed this answer from recall. Grade it yourself against the reference answer, then record the verdict with quiz_grade.";
		text += `\nTheir answer: ${answer}`;
		text += `\nReference answer: ${correctAnswer}`;
	}
	text += `\nExplanation shown to them: ${explanation}`;

	return {
		content: [{ type: "text" as const, text }],
		details: buildStructuredResult(
			"answered",
			question,
			answer,
			correctAnswer,
			explanation,
			context,
			undefined,
			dontKnow,
		),
	};
}

// Top border + question + optional context.
function pushHeader(lines: string[], theme: any, width: number, question: string, context: string | undefined): void {
	lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
	addWrapped(lines, theme.fg("text", question), width, " ");
	if (context) {
		lines.push("");
		addWrapped(lines, theme.fg("muted", context), width, " ");
	}
}

// The "I don't know" row under the answer box — visually separated and dimmed
// so it reads as a deliberate opt-out rather than part of the answer.
function pushDontKnowRow(lines: string[], theme: any, width: number, focused: boolean): void {
	lines.push("");
	const prefix = focused ? theme.fg("accent", "> ") : "  ";
	const styled = focused ? theme.fg("accent", DONT_KNOW_LABEL) : theme.fg("dim", DONT_KNOW_LABEL);
	lines.push(truncateToWidth(`${prefix}${styled}`, width));
}

// Feedback block, rendered after the user submits. There is no ✓/✗ here: the
// tool cannot grade free text, so it shows what the user wrote next to the
// reference answer and lets them compare. The agent's grade arrives separately.
function renderFeedback(
	lines: string[],
	theme: any,
	width: number,
	answer: string | undefined,
	correctAnswer: string,
	explanation: string,
	dontKnow: boolean,
): void {
	const add = (text: string) => lines.push(truncateToWidth(text, width));

	lines.push("");
	if (dontKnow) {
		add(theme.fg("warning", ` · You said: ${DONT_KNOW_LABEL}`));
	} else {
		add(theme.fg("muted", " Your answer:"));
		addWrapped(lines, theme.fg("accent", answer || "(empty)"), width, " ");
	}

	lines.push("");
	add(theme.fg("muted", " Reference answer:"));
	addWrapped(lines, theme.fg("success", correctAnswer), width, " ");

	if (explanation) {
		lines.push("");
		addWrapped(lines, theme.fg("text", explanation), width, " ");
	}

	lines.push("");
	add(theme.fg("dim", " Enter/Esc to continue"));
}

// The single component: type an answer, or opt out with "I don't know", then
// read the reference answer.
async function askFreeResponse(
	ctx: any,
	question: string,
	context: string | undefined,
	correctAnswer: string,
	explanation: string,
): Promise<QuizResponse | null> {
	return ctx.ui.custom<QuizResponse | null>(
		(tui: any, theme: any, _kb: any, done: (result: QuizResponse | null) => void) => {
			let phase: "answer" | "feedback" = "answer";
			let focus: "answer" | "dontKnow" = "answer";
			let answer: string | undefined;
			let dontKnow = false;
			let cachedLines: string[] | undefined;
			let cachedWidth = -1;

			const editor = new Editor(tui, createEditorTheme(theme));
			editor.focused = true;

			function refresh() {
				cachedLines = undefined;
				tui.requestRender();
			}

			// Enter submits. The editor clears its buffer on submit, so the value
			// MUST be taken from the callback argument rather than read back after.
			// Ctrl+J still inserts a newline (pi convention), so multi-line answers
			// work. An empty submit is ignored: use "I don't know" to opt out, so an
			// accidental Enter is never recorded as an answer.
			editor.onSubmit = (value: string) => {
				const trimmed = value.trim();
				if (!trimmed) return;
				answer = trimmed;
				dontKnow = false;
				phase = "feedback";
				refresh();
			};

			function response(): QuizResponse {
				return dontKnow ? { dontKnow: true } : { dontKnow: false, answer };
			}

			function handleInput(data: string) {
				if (phase === "feedback") {
					if (matchesKey(data, Key.enter) || matchesKey(data, Key.escape)) {
						done(response());
					}
					return;
				}

				// Tab toggles between the answer box and the "I don't know" row.
				if (matchesKey(data, Key.tab)) {
					focus = focus === "answer" ? "dontKnow" : "answer";
					editor.focused = focus === "answer";
					refresh();
					return;
				}

				if (focus === "dontKnow") {
					if (matchesKey(data, Key.enter)) {
						dontKnow = true;
						answer = undefined;
						phase = "feedback";
						refresh();
						return;
					}
					if (matchesKey(data, Key.up)) {
						focus = "answer";
						editor.focused = true;
						refresh();
						return;
					}
					if (matchesKey(data, Key.escape)) {
						done(null);
					}
					return;
				}

				// focus === "answer". Esc is handled here rather than forwarded, so a
				// part-written answer is never discarded by one keypress: the first Esc
				// clears the box, a second one (now empty) cancels the quiz.
				if (matchesKey(data, Key.escape)) {
					if (editor.getText().trim().length === 0) {
						done(null);
					} else {
						editor.setText("");
						refresh();
					}
					return;
				}
				if (matchesKey(data, Key.down) && editor.getText().length === 0) {
					focus = "dontKnow";
					editor.focused = false;
					refresh();
					return;
				}
				editor.handleInput(data);
				tui.requestRender();
			}

			function render(width: number): string[] {
				// The cache MUST be keyed on width: pi-tui calls requestRender() but NOT
				// invalidate() on terminal resize, so render() can be re-entered with a
				// new width. Returning stale wider lines trips the TUI width guard and
				// crashes the process.
				if (cachedLines && cachedWidth === width) return cachedLines;

				const lines: string[] = [];
				const add = (text: string) => lines.push(truncateToWidth(text, width));
				pushHeader(lines, theme, width, question, context);

				if (phase === "feedback") {
					renderFeedback(lines, theme, width, answer, correctAnswer, explanation, dontKnow);
					add(theme.fg("accent", "─".repeat(width)));
					cachedLines = lines;
					cachedWidth = width;
					return lines;
				}

				lines.push("");
				const label = focus === "answer" ? theme.fg("accent", "Your answer:") : theme.fg("muted", "Your answer:");
				addWrapped(lines, label, width, " ");
				for (const line of editor.render(width)) lines.push(line);

				pushDontKnowRow(lines, theme, width, focus === "dontKnow");

				lines.push("");
				if (focus === "answer") {
					add(theme.fg("dim", " Enter submit • Ctrl+J newline • Tab I don't know • Esc clear/cancel"));
				} else {
					add(theme.fg("dim", " Enter I don't know • Tab back to answer • Esc cancel"));
				}
				add(theme.fg("accent", "─".repeat(width)));
				// Not cached while the answer box is focused: the editor draws a live cursor.
				if (focus !== "answer") {
					cachedLines = lines;
					cachedWidth = width;
				}
				return lines;
			}

			return {
				render,
				invalidate: () => {
					cachedLines = undefined;
					editor.invalidate();
				},
				handleInput,
			};
		},
	);
}

// Shared UI mutex. ctx.ui.custom()/editor can only handle one active call at
// a time, so ALL pop-up-style tools (ask_user_question, quiz, ...) must
// serialize against each other, not just against themselves. We stash one
// mutex on globalThis so separate extension files can share it without
// importing each other.
const SHARED_UI_LOCK_KEY = "__piSharedUiLock";
function getSharedUiLock() {
	const g = globalThis as any;
	if (!g[SHARED_UI_LOCK_KEY]) {
		let chain: Promise<void> = Promise.resolve();
		g[SHARED_UI_LOCK_KEY] = {
			withLock<T>(fn: () => T | Promise<T>): Promise<T> {
				const prev = chain;
				let release: () => void;
				chain = new Promise<void>((r) => { release = r; });
				return prev.then(fn).finally(() => release!());
			},
		};
	}
	return g[SHARED_UI_LOCK_KEY] as { withLock<T>(fn: () => T | Promise<T>): Promise<T> };
}
const sharedUiLock = getSharedUiLock();

function withUILock<T>(fn: () => Promise<T>): Promise<T> {
	return sharedUiLock.withLock(fn);
}

const VERDICT_LABEL: Record<QuizVerdict, string> = {
	correct: "correct ✓",
	partial: "partly right ~",
	incorrect: "incorrect ✗",
};

export default function quiz(pi: ExtensionAPI) {
	pi.registerTool({
		name: "quiz",
		label: "quiz",
		description:
			"Ask the user a question that has a correct answer and make them TYPE the answer from recall. There are no options to pick from: a picked option can be right by luck and tells you only right or wrong, whereas what they write shows which parts of the idea they hold and where it is thin. Unlike ask_user_question (which collects preferences/decisions with no right answer), quiz always has a correct answer supplied by you. On submit it reveals your reference answer and explanation to the user and returns their answer verbatim. It does NOT grade — you read the answer, grade it, and record the verdict with quiz_grade, which is what puts a ✓/✗ on the entry in the user's lesson log. An 'I don't know' opt-out is always available and comes back as a distinct signal rather than a wrong answer. Use quiz to (1) assess what the learner already understands before teaching, and (2) run tight retrieval loops after explaining, or probe understanding whenever you're unsure they've got it.",
		promptSnippet:
			"Use the quiz tool to test the user with a typed free-response question (required reference answer + required explanation), then grade their answer with quiz_grade. For non-graded questions, use ask_user_question.",
		promptGuidelines: [
			"quiz has a correct answer; ask_user_question does not. If the question has a correct answer, use quiz. If you just need a preference, decision, or open-ended input, use ask_user_question.",
			"Answers are typed, not picked. There are no options, no multi-select and no shuffling — write a question that can be answered from recall in a sentence or two.",
			"correctAnswer is REQUIRED: the reference answer in full prose. The user's wording will differ, so state everything a complete answer must contain rather than a phrase to match. This is what you grade against and what the user is shown after submitting.",
			"explanation is REQUIRED — always say why the correct answer is correct.",
			"After a typed answer comes back, call quiz_grade immediately, in the same turn, before you say anything else. Skipping it leaves the entry ungraded in the user's lesson log.",
			"Grade on substance, not wording. If they have the idea in their own words, that is correct. Reserve 'partial' for a real piece of the idea with something material missing, and 'incorrect' for not having it or holding a misconception.",
			"Read the wording itself, not just the verdict. Which words they reach for, what they hedge, what they leave out and what they add all say where the model is thin — that is the point of typed answers, and it is what you plan the next node from.",
			"If a result comes back as dontKnow, the user honestly did not know and did NOT guess — treat it as a genuine knowledge gap to teach into, not as a wrong answer. Nothing was attempted, so do not call quiz_grade for it.",
			"Ask one question per tool call. To probe nuance, ask several quick questions and adapt each one to the previous answer, rather than writing one giant question.",
			"Ask for something recallable and specific enough to have a definite answer. 'Explain TCP' has no gradable answer; 'why does TCP number its segments?' does.",
			"Don't leak the answer in the question or details, and don't ask a question whose answer is sitting in the sentence you just wrote.",
		],
		parameters: QuizParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const context = params.details?.trim() || undefined;
			const explanation = params.explanation.trim();
			const correctAnswer = params.correctAnswer.trim();

			if (!correctAnswer) {
				return unavailableResult(params.question, "quiz requires a non-empty correctAnswer", correctAnswer, context);
			}

			if (signal?.aborted) {
				return cancelledResult(params.question, correctAnswer, context);
			}

			if (!ctx.hasUI) {
				return unavailableResult(params.question, "quiz requires interactive mode UI", correctAnswer, context);
			}

			// Deliberately omits correctAnswer/explanation: this fires before the
			// user has answered and must not leak the answer to any listener.
			onUpdate?.({
				content: [{ type: "text", text: "Awaiting user response..." }],
			});

			return withUILock(async () => {
				const response = await askFreeResponse(ctx, params.question, context, correctAnswer, explanation);
				if (!response) {
					return cancelledResult(params.question, correctAnswer, context);
				}
				return buildResult(params.question, context, response, correctAnswer, explanation);
			});
		},

		renderCall(args, theme) {
			// NOTE: never render correctAnswer or explanation here — it would leak
			// the answer into the transcript before the user responds.
			return new Text(
				theme.fg("toolTitle", theme.bold("quiz ")) + theme.fg("muted", args.question),
				0,
				0,
			);
		},

		renderResult(result, _options, theme) {
			const details = result.details as QuizResultDetails | undefined;
			if (!details) {
				const first = result.content[0];
				return new Text(first?.type === "text" ? first.text : "", 0, 0);
			}

			if (details.status === "cancelled") {
				return new Text(theme.fg("warning", details.message || "Cancelled"), 0, 0);
			}
			if (details.status === "unavailable") {
				return new Text(theme.fg("warning", details.message || "quiz unavailable"), 0, 0);
			}

			const lines: string[] = [];
			if (details.dontKnow) {
				lines.push(theme.fg("warning", DONT_KNOW_LABEL));
			} else {
				lines.push(theme.fg("accent", details.answer || "(empty)"));
			}
			if (details.correctAnswer) {
				lines.push("");
				lines.push(theme.fg("success", `Reference: ${details.correctAnswer}`));
			}
			if (details.explanation) {
				lines.push(theme.fg("muted", details.explanation));
			}
			return new Text(lines.join("\n"), 0, 0);
		},
	});

	pi.registerTool({
		name: "quiz_grade",
		label: "quiz_grade",
		description:
			"Record your grade for the answer the user just typed into `quiz`. Call this immediately after every quiz that came back with a typed answer, before saying anything else. quiz cannot grade free text itself, so this call is the only thing that marks the entry ✓/✗ in the user's lesson log. Do not call it for a quiz that came back as dontKnow — nothing was attempted there.",
		promptSnippet:
			"After a quiz returns a typed answer, call quiz_grade with your verdict to record it in the lesson log.",
		promptGuidelines: [
			"Call this in the same turn as the quiz result it grades, before any other tool call or prose.",
			"It applies to the most recent quiz answer, so grade them one at a time: quiz, grade, quiz, grade.",
			"Grade on substance, not wording — their own words for the right idea are correct.",
			"Do not call this after a dontKnow result; there is nothing to grade.",
			"Keep `assessment` to one specific sentence: what they had, what was missing. It is written into the lesson log for the user to re-read.",
		],
		parameters: QuizGradeParams,

		async execute(_toolCallId, params) {
			const verdict = params.verdict as QuizVerdict;
			const assessment = params.assessment?.trim() || undefined;
			let text = `Recorded: ${VERDICT_LABEL[verdict]}`;
			if (assessment) text += ` — ${assessment}`;
			return {
				content: [{ type: "text" as const, text }],
				details: { verdict, assessment } as QuizGradeDetails,
			};
		},

		renderCall(args, theme) {
			const verdict = args.verdict as QuizVerdict | undefined;
			const label = verdict ? VERDICT_LABEL[verdict] || verdict : "";
			return new Text(
				theme.fg("toolTitle", theme.bold("quiz_grade ")) + theme.fg("muted", label),
				0,
				0,
			);
		},

		renderResult(result, _options, theme) {
			const details = result.details as QuizGradeDetails | undefined;
			if (!details) {
				const first = result.content[0];
				return new Text(first?.type === "text" ? first.text : "", 0, 0);
			}
			const color = details.verdict === "correct" ? "success" : details.verdict === "partial" ? "warning" : "error";
			let text = theme.fg(color, VERDICT_LABEL[details.verdict]);
			if (details.assessment) text += `\n${theme.fg("muted", details.assessment)}`;
			return new Text(text, 0, 0);
		},
	});
}
