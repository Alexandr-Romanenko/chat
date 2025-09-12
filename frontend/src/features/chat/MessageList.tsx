interface Message {
  id: number;
  text: string;
  sender: string;
}

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((m) => (
        <div key={m.id} className="p-2 bg-gray-200 rounded">
          <b>{m.sender}:</b> {m.text}
        </div>
      ))}
    </div>
  );
}
