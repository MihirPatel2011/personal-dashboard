// Index — a navigable table of contents, derived automatically from the logs and
// collections that exist. Clicking an entry jumps to that page.
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { generateIndex } from '../../utils/bujo';

export default function IndexPage() {
  const navigate = useNavigate();
  const { bujoEntries, bujoCollections } = useData();
  const sections = generateIndex(bujoEntries, bujoCollections);

  return (
    <div className="bujo-page">
      <div className="bujo-section-head">
        <h2>Index</h2>
        <p className="bujo-section-sub">Everything in your journal, kept current automatically.</p>
      </div>

      <div className="bujo-index">
        {sections.map(sec => (
          <div key={sec.group} className="bujo-index-group">
            <div className="bujo-col-label">{sec.group}</div>
            {sec.items.map(item => (
              <button key={item.id} className="bujo-index-row" onClick={() => navigate(item.route)}>
                <span className="bujo-index-label">{item.label}</span>
                <span className="bujo-index-sub">{item.sub}</span>
                <ChevronRight size={15} className="bujo-index-arrow"/>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
