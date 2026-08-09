import type { ReactNode } from 'react';

/**
 * A specification table — commercial voice of the GROUNDWORK system.
 */
export default function SpecBlock({
  caption,
  rows,
  captionVisible = false,
}: {
  caption: string;
  rows: Array<{ label: string; value: ReactNode }>;
  captionVisible?: boolean;
}) {
  return (
    <table className="gw-spec-table">
      <caption className={captionVisible ? 'gw-spec' : 'sr-only'}>{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
