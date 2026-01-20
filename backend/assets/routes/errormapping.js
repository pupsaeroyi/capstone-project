import { joinSession } from "./services/bookingService.js";

export async function joinSessionHandler(req, res) {
  try {
    const userId = req.body.userId;
    const sessionId = req.body.sessionId;

    const booking = await joinSession({ sessionId, userId });
    return res.status(201).json({ ok: true, booking });

  } catch (err) {
    // log the real error for debugging
    console.error("joinSession error:", err);

    // map known errors to user-friendly responses
    if (err.code === "SESSION_NOT_FOUND") {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }
    if (err.code === "SESSION_FULL") {
      return res.status(409).json({ ok: false, error: "Session is full" });
    }
    if (err.code === "ALREADY_JOINED") {
      return res.status(409).json({ ok: false, error: "Already joined" });
    }

    // unknown error
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
