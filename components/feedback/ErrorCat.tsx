"use client";
export function ErrorCat() {
  return (
    <svg
      className="q1-error-cat"
      viewBox="0 0 600 390"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="300" cy="344" rx="215" ry="16" fill="#000" opacity=".3" />
      <path d="M65 319H535" stroke="#44483d" strokeWidth="2" />
      <g className="q1-cat-tail">
        <path
          d="M188 293C100 309 116 214 79 224"
          stroke="#e6e7da"
          strokeWidth="23"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M171 311C166 250 183 213 236 210C284 214 302 259 290 312"
        fill="#e6e7da"
        stroke="#252920"
        strokeWidth="4"
      />
      <path d="M208 246L227 261L245 245L255 310H198Z" fill="#cae213" />
      <g className="q1-cat-head">
        <path
          d="M170 141L168 82Q172 69 184 80L218 110Q245 103 270 115L309 84Q321 76 318 95L311 159Q326 198 291 219Q254 244 205 224Q161 210 163 176Z"
          fill="#f1f0e5"
          stroke="#252920"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M180 103L183 138L205 120Z M300 109L278 126L306 143Z"
          fill="#c1c4b1"
        />
        <path
          d="M220 110L228 134M240 109L245 134M260 112L260 133"
          stroke="#b8bdab"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <g className="q1-cat-eyes">
          <ellipse
            cx="212"
            cy="167"
            rx="22"
            ry="23"
            fill="white"
            stroke="#34392c"
            strokeWidth="3"
          />
          <ellipse
            cx="278"
            cy="167"
            rx="22"
            ry="23"
            fill="white"
            stroke="#34392c"
            strokeWidth="3"
          />
          <g className="q1-cat-pupils">
            <ellipse cx="218" cy="169" rx="6" ry="13" fill="#20251b" />
            <ellipse cx="284" cy="169" rx="6" ry="13" fill="#20251b" />
          </g>
        </g>
        <path
          d="M239 191L247 196L255 191"
          fill="#727865"
          stroke="#727865"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M247 198V208M234 210L246 207L258 211"
          stroke="#34392c"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M185 190L146 184M184 201L144 206M299 191L334 185M301 203L338 209"
          stroke="#a2aa94"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M190 285L182 311Q190 325 217 315L221 283 M266 285L270 312Q290 323 308 309L292 280"
        fill="#f1f0e5"
        stroke="#252920"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="417" cy="309" rx="89" ry="13" fill="#535b43" />
      <ellipse cx="417" cy="305" rx="78" ry="7" fill="#d3d7c5" />
      <ellipse cx="417" cy="304" rx="48" ry="4" fill="#989e86" />
      <g className="q1-cat-lid">
        <path
          d="M338 273Q345 211 417 209Q489 211 497 273Z"
          fill="#292f22"
          stroke="#b7c39a"
          strokeWidth="3"
        />
        <path
          d="M350 267Q357 225 397 221"
          stroke="#555f43"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M332 276H503"
          stroke="#d6e1c3"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M407 205Q407 191 417 191Q427 191 427 205"
          stroke="#cae213"
          strokeWidth="5"
        />
      </g>
      <g
        className="q1-cat-question"
        stroke="#cae213"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <path d="M360 111Q357 94 375 94Q393 95 388 110L376 121V128" />
        <path d="M376 142V143" />
      </g>
    </svg>
  );
}
