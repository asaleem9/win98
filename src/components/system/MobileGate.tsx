/**
 * A period-styled "desktop only" screen shown to touch devices. Windows 98
 * wants a mouse and keyboard — dragging windows, right-click menus, and the
 * games all assume a pointer — so phones and tablets get a friendly stop.
 *
 * Visibility is driven entirely by a CSS media query (see .mobile-gate in
 * win98.css), so it needs no client detection, renders identically on the
 * server, and never flashes. When shown it covers everything at the top of the
 * stacking order, including the boot and login screens.
 */
export function MobileGate() {
  return (
    <div className="mobile-gate" role="dialog" aria-label="Desktop computer required">
      <div className="mobile-gate-window">
        <div className="mobile-gate-title">
          <span>Windows 98</span>
        </div>
        <div className="mobile-gate-body">
          <img
            src="/icons/my-computer-32.svg"
            alt=""
            width={32}
            height={32}
            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: 8 }}>
              This program requires a desktop computer.
            </p>
            <p style={{ marginBottom: 8 }}>
              Windows 98 was built for a mouse and keyboard. Dragging windows,
              right-clicking, and the games all need a real pointer.
            </p>
            <p>
              Please visit on a PC or laptop for the full experience.
            </p>
          </div>
        </div>
        <div className="mobile-gate-footer">
          <span>Recommended: 640 &times; 480 display, mouse, keyboard.</span>
        </div>
      </div>
    </div>
  );
}
