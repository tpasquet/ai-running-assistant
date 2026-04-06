export function RunningIllustration() {
  return (
    <svg
      viewBox="0 0 480 700"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5722" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF7043" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E64A19" stopOpacity="0.2" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="480" height="700" fill="url(#bgGrad)" />

      {/* Decorative circles — background depth */}
      <circle cx="420" cy="80" r="90" fill="white" opacity="0.05" />
      <circle cx="420" cy="80" r="55" fill="white" opacity="0.05" />
      <circle cx="60"  cy="600" r="110" fill="white" opacity="0.05" />
      <circle cx="60"  cy="600" r="65" fill="white" opacity="0.05" />

      {/* Sun */}
      <circle cx="380" cy="110" r="38" fill="white" opacity="0.15" />
      <circle cx="380" cy="110" r="25" fill="white" opacity="0.2" />

      {/* Horizon / ground */}
      <ellipse cx="240" cy="540" rx="280" ry="24" fill="url(#groundGrad)" />

      {/* Road perspective */}
      <path
        d="M120,700 L210,520 L270,520 L360,700 Z"
        fill="white"
        opacity="0.06"
      />
      <path
        d="M210,520 L240,520 L240,700 L200,700 Z"
        fill="white"
        opacity="0.04"
      />

      {/* Speed / motion lines */}
      <g stroke="white" strokeLinecap="round" opacity="0.25">
        <line x1="30"  y1="305" x2="110" y2="305" strokeWidth="3" />
        <line x1="50"  y1="325" x2="115" y2="325" strokeWidth="2" />
        <line x1="40"  y1="345" x2="100" y2="345" strokeWidth="2" />
        <line x1="60"  y1="365" x2="105" y2="365" strokeWidth="1.5" />
      </g>

      {/* === Runner silhouette (stroke-based, mid-stride) === */}
      <g
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#glow)"
      >
        {/* Head */}
        <circle cx="248" cy="178" r="22" strokeWidth="7" />

        {/* Neck → torso (forward lean ~10°) */}
        <line x1="248" y1="200" x2="242" y2="280" strokeWidth="7" />

        {/* Right arm — swings forward & up */}
        <polyline points="247,220 272,205 288,185" strokeWidth="6" />

        {/* Left arm — swings back & down */}
        <polyline points="243,222 220,248 210,272" strokeWidth="6" />

        {/* Right leg — forward stride, knee bent */}
        <polyline points="244,280 262,335 248,390" strokeWidth="7" />
        {/* Right foot — pointing forward */}
        <line x1="248" y1="390" x2="278" y2="383" strokeWidth="5" />

        {/* Left leg — back, pushing off */}
        <polyline points="240,280 222,330 232,385" strokeWidth="7" />
        {/* Left foot — toe push-off */}
        <line x1="232" y1="385" x2="210" y2="395" strokeWidth="5" />
      </g>

      {/* Shadow under runner */}
      <ellipse cx="248" cy="530" rx="42" ry="8" fill="black" opacity="0.18" />

      {/* Floating dots — decorative */}
      <circle cx="340" cy="290" r="5" fill="white" opacity="0.3" />
      <circle cx="360" cy="310" r="3" fill="white" opacity="0.2" />
      <circle cx="325" cy="320" r="3" fill="white" opacity="0.2" />
      <circle cx="150" cy="200" r="4" fill="white" opacity="0.2" />
      <circle cx="135" cy="225" r="2.5" fill="white" opacity="0.15" />

      {/* Bottom tagline */}
      <text
        x="240"
        y="610"
        textAnchor="middle"
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="white"
        opacity="0.95"
      >
        Courez plus loin.
      </text>
      <text
        x="240"
        y="638"
        textAnchor="middle"
        fontFamily="'Inter', sans-serif"
        fontWeight="400"
        fontSize="15"
        fill="white"
        opacity="0.7"
      >
        Récupérez mieux. Progressez avec l&apos;IA.
      </text>

      {/* Logo mark */}
      <text
        x="240"
        y="55"
        textAnchor="middle"
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="700"
        fontSize="26"
        fill="white"
        opacity="0.95"
      >
        RunCoach AI
      </text>
    </svg>
  );
}
