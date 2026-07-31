export default function DashboardCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
      <h3>{title}</h3>
      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );
}