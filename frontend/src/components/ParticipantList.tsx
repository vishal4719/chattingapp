import type { Participant } from "../lib/api";

interface Props {
  participants: Participant[];
}

export function ParticipantList({ participants }: Props) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-2">No participants yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Phone</th>
            <th className="py-2 pr-4">IP Address</th>
            <th className="py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-b border-slate-800">
              <td className="py-2 pr-4">{p.displayName}</td>
              <td className="py-2 pr-4">{p.phone}</td>
              <td className="py-2 pr-4 font-mono text-xs">{p.ipAddress}</td>
              <td className="py-2 text-slate-400">
                {new Date(p.joinedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
