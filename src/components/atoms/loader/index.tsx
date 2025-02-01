export const Spinner = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <section className="fixed inset-0 flex flex-col justify-center items-center z-50 bg-gradient-to-br from-purple-50 to-orange-50">
      <section className="absolute text-center flex flex-col items-center">
        <div className="relative w-[120px] h-[120px]">
          <svg
            className="w-[120px] h-[120px] animate-spin"
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="loading"
          >
            <defs>
              <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#40189D" />
                <stop offset="25%" stopColor="#FF9900" />
                <stop offset="50%" stopColor="#4568F9" />
                <stop offset="75%" stopColor="#2FAB73" />
                <stop offset="100%" stopColor="#40189D" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="80 240"
              strokeDashoffset="0"
              transform="rotate(0 60 60)"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 60 60"
                to="360 60 60"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
        <p className="mt-6 text-lg font-semibold text-gray-700 animate-pulse">
          {message}
        </p>
        <div className="mt-2 flex space-x-1">
          <div
            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
      </section>
    </section>
  );
};

