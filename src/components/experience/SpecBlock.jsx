/**
 * A specification table — the commercial voice of the GROUNDWORK system.
 *
 * Rendered as a real `<table>` with a `<caption>` and `<th scope="row">` so a
 * screen reader announces each value with its label. Numerals are tabular via
 * `.gw-spec-table`, and every cell uses `text-align: start` so the block
 * mirrors correctly in Arabic without a single RTL override.
 *
 * @param {{
 *   caption: string,
 *   rows: Array<{ label: string, value: any }>,
 *   captionVisible?: boolean,
 * }} props
 */
export default function SpecBlock({ caption, rows, captionVisible = false }) {
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
