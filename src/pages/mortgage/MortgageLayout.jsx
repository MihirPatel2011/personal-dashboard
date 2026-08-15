import { Outlet } from 'react-router-dom';

// The sidebar already lists every CRM page and marks the current one, so this
// layout carries no chrome of its own — the page starts at the top of the pane.
export default function MortgageLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet/>
      </div>
    </div>
  );
}
