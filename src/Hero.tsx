/** An original winged track shoe, drawn in the club's screen-print palette. */
export function TrackArt() {
  return (
    <svg className="track-art" viewBox="0 0 270 190" aria-hidden="true">
      <defs>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#645285" />
        </pattern>
      </defs>
      <g fill="none" stroke="#a28ad6" opacity=".8" strokeWidth="2">
        {[0, 12, 24, 36, 48].map((d) => (
          <path
            key={d}
            d={`M${-40 + d} 198 Q86 120 178 170 Q240 201 300 ${52 + d}`}
          />
        ))}
      </g>
      <g
        transform="translate(9 -3) rotate(-15 140 108)"
        stroke="#212124"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path
          d="M46 118 Q71 117 98 99 L128 60 Q130 54 136 58 L148 70 Q157 79 170 76 L186 68 Q193 64 196 72 L209 103 Q214 117 198 124 Q151 140 60 136 Q39 136 38 128 Q37 122 46 118Z"
          fill="#f8f3df"
        />
        <path
          d="M42 124 Q95 132 198 109 L208 102 L211 111 Q214 122 201 128 Q132 149 54 140 Q37 139 38 130Z"
          fill="#272b28"
        />
        <path
          d="M47 127 Q108 138 204 113"
          stroke="#ccfc71"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M113 90 Q144 71 174 49 Q166 67 150 79 L171 70 Q162 82 148 90 L165 83 Q145 105 107 112Z"
          fill="#ceff76"
        />
        <path d="M116 95 Q136 86 151 73" fill="none" />
        <path d="M50 117 Q72 109 81 99 L100 98 L91 117Z" fill="#b7a3ed" />
        <path
          d="M165 109 Q188 98 194 82 L203 101 L193 109Z"
          fill="url(#dots)"
        />
        <path d="M93 94 l15 8 m-9-16 15 8 m-9-16 15 8" fill="none" />
      </g>
      <g stroke="#312b3e" strokeWidth="3" strokeLinecap="round">
        <path d="M36 91l37-10m-28 1 17-5m-38 24 32-9" />
      </g>
      <path d="m212 27 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f9f6dc" />
      <circle cx="36" cy="54" r="3" fill="#fff9e9" />
    </svg>
  );
}
