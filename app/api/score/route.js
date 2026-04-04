import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runInferenceScript() {
  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, "pipeline", "inference.py");

  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-u", scriptPath], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    let stderr = "";
    let stdout = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const detail = stderr.trim() || stdout.trim() || `Python exited with code ${code}`;
        reject(new Error(detail));
      }
    });
  });
}

export async function POST() {
  try {
    await runInferenceScript();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : String(err);

    const hint =
      message.includes("ENOENT") || message.includes("spawn python3")
        ? " Install Python 3 and ensure `python3` is on PATH, or run `python3 pipeline/inference.py` from the project root to verify."
        : "";

    return NextResponse.json(
      { error: `${message}${hint}`.trim() },
      { status: 500 }
    );
  }
}
