import { Link } from 'react-router-dom';

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="brand"
      aria-label={to === '/' ? 'Groundwork home' : 'Groundwork workspace'}
    >
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        groundwork<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
