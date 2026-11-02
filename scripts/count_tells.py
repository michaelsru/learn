"""Count AI-writing tells in pi session transcripts or markdown files.

Usage: python count_tells.py <file.jsonl | file.md> [...]

For a .jsonl session it reads what the learner sees: assistant text plus the
question, details, correctAnswer and explanation of quiz and ask_user_question
calls. Code spans, code blocks and LaTeX are stripped before counting, so `a = b`
in code is not symbol-speak.
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

TELLS = {
    "em dash": r"—",
    "spaced en dash": r" – ",
    "arrow": r"→|⇒|(?<![<-])->(?!>)",
    "= as a verb": r"[A-Za-z)] = [A-Za-z(]",
    "X, not Y": r"\w, not (?:a |an |the )?\w",
    "isn't X, it's Y": r"\b(?:isn't|is not|aren't|not just|not only)\b[^.?!\n]{0,80}, (?:it's|it is|they're|but)\b",
    "framing label": r"\b(?:payoff|the click|collaps\w*|the (?:key|one) (?:insight|idea|half|point|thing)|the whole (?:thing|map|point)|here's where|tricky part|worth (?:reasoning|noting|slowing|remembering)|the piece worth)\b",
    "narration": r"(?:^|(?<=[.!?]\s))(?:Let me|Let's|Before I go further|Quick confirm|One more \w+, then|Now (?:the|let's|for)|Node \w+ is in)\b",
    "AI vocabulary": r"\b(?:crucial|delve\w*|pivotal|showcas\w+|tapestry|testament|underscor\w+|vibrant|intricate|landscape|foster\w*|enhanc\w+|garner\w*|interplay|enduring|seamless\w*|robust|leverag\w+|utiliz\w+)\b",
    "serves as": r"\b(?:serves as|stands as|boasts)\b",
    "semicolon": r";",
    "intensifier": r"\b(?:incredibly|extremely|remarkably|highly|truly|fundamentally|essentially|really)\b",
}
PATTERNS = {name: re.compile(rx, re.IGNORECASE | re.MULTILINE) for name, rx in TELLS.items()}
PATTERNS["narration"] = re.compile(TELLS["narration"], re.MULTILINE)

STRIP = [
    re.compile(r"```.*?```", re.DOTALL),
    re.compile(r"\$\$.*?\$\$", re.DOTALL),
    re.compile(r"`[^`\n]*`"),
    re.compile(r"\$[^$\n]+\$"),
]


def strip_code(text: str) -> str:
    for rx in STRIP:
        text = rx.sub(" ", text)
    return text


def session_text(path: Path) -> list[str]:
    chunks = []
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        message = entry.get("message") or {}
        if message.get("role") != "assistant":
            continue
        for part in message.get("content", []):
            if part.get("type") == "text":
                chunks.append(part["text"])
            elif part.get("type") == "toolCall" and part.get("name") in ("quiz", "ask_user_question"):
                args = part.get("arguments") or {}
                chunks += [args[k] for k in ("question", "details", "correctAnswer", "explanation") if isinstance(args.get(k), str)]
    return chunks


def count(path: Path) -> tuple[Counter, int]:
    chunks = session_text(path) if path.suffix == ".jsonl" else [path.read_text(encoding="utf-8")]
    text = "\n\n".join(strip_code(c) for c in chunks)
    hits = Counter({name: len(rx.findall(text)) for name, rx in PATTERNS.items()})
    return hits, len(text.split())


def main(paths: list[str]) -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    for p in paths:
        hits, words = count(Path(p))
        total = sum(hits.values())
        rate = 1000 * total / words if words else 0
        print(f"{Path(p).name}: {total} tells in {words} words ({rate:.1f} per 1000 words)")
        for name, n in hits.most_common():
            if n:
                print(f"  {n:4d}  {name}")


if __name__ == "__main__":
    main(sys.argv[1:])
