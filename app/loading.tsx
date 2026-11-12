// The route fallback must not mount a second branded animation.
export default function Loading() {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000" }}
      role="status"
      aria-label="Загрузка страницы"
    />
  );
}
