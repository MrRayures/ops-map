/** Creates a toast helper bound to the #toast element. Returns a showToast fn. */
export function createToast(): (message: string) => void {
  let toastTimer: number | null = null;
  return (message: string): void => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.hidden = true;
      toastTimer = null;
    }, 2000);
  };
}
