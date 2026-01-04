export function IntroBox() {
  return (
    <div className="relative mx-auto max-w-3xl transform rotate-1 transition-transform hover:rotate-0 duration-500 p-8 md:p-12 bg-white text-black shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-8">
      {/* Lined paper effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 27px, #e5e5e5 28px)",
          backgroundSize: "100% 28px",
        }}
      />

      {/* DRAFT 1.0 watermark */}
      <div className="absolute top-5 right-5 font-oswald text-[2rem] font-bold text-[rgba(200,0,0,0.3)] transform rotate-[15deg] border-4 border-[rgba(200,0,0,0.3)] px-4 py-1 rounded pointer-events-none">
        DRAFT 1.0
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h2 className="font-courier text-lg md:text-xl font-bold mb-4">
          INT. PRODUCTION OFFICE - DAY
        </h2>
        <p className="font-courier text-base mb-4 leading-relaxed">
          PRODUCER reads a screenplay. It&apos;s good. But he can&apos;t{" "}
          <span className="italic">see</span> it. He tosses it on the
          &quot;Maybe&quot; pile.
        </p>
        <p className="font-courier text-base mb-4 leading-relaxed">
          He picks up an iPad. Presses play. A RIP REEL starts. Atmospheric
          music. Cinematic shots. Voiceover.
        </p>
        <p className="font-bold font-courier text-black/70 mt-4 mb-4 text-center">
          (beat)
        </p>
        <p className="font-courier text-base leading-relaxed">
          <span className="uppercase tracking-wider">PRODUCER</span>
          <br />
          Get me the agent. Now.
        </p>
      </div>
    </div>
  );
}
