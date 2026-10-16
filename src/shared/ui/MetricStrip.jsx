export default function MetricStrip({ items = [] }) {
  return (
    <div className="go-metric-strip">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`go-metric ${index ? 'go-metric--divided' : ''}`}>
            {Icon ? <Icon className="go-metric-icon" strokeWidth={1.8} /> : null}
            <div className="min-w-0">
              <div className="go-metric-label">{item.label}</div>
              <div className="go-metric-value">{item.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
