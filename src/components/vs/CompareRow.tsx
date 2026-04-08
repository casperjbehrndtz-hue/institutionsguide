export function CompareRow({
  label,
  a,
  b,
  highlightLower = false,
  aNum,
  bNum,
}: {
  label: string;
  a: string;
  b: string;
  highlightLower?: boolean;
  aNum?: number | null;
  bNum?: number | null;
}) {
  let aClass = "";
  let bClass = "";
  if (highlightLower && aNum != null && bNum != null) {
    if (aNum < bNum) {
      aClass = "text-green-600 font-semibold";
    } else if (bNum < aNum) {
      bClass = "text-green-600 font-semibold";
    }
  }

  return (
    <tr className="border-b">
      <td className="py-3 pr-4 text-muted">{label}</td>
      <td className={`py-3 px-4 text-center font-mono ${aClass}`}>{a}</td>
      <td className={`py-3 pl-4 text-center font-mono ${bClass}`}>{b}</td>
    </tr>
  );
}
