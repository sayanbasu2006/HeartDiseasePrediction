import { useSession } from "@/components/provider";

export function BrowserStorageControl() {
  const { storage, setStorageEnabled } = useSession();
  return (
    <div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={storage.enabled}
          disabled={!storage.ready}
          onChange={(event) => setStorageEnabled(event.target.checked)}
        />
        Save workspace data in this browser
      </label>
      <p className="caption">
        Keep assessments, drafts, and upload previews after refresh. Turn off
        browser saving to remove the saved copy.
      </p>
      {storage.error && <p role="status">{storage.error}</p>}
    </div>
  );
}
