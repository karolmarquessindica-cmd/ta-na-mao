import React from 'react';

// Helper components
const DashCard = ({ title, value }) => (
  <div className="dash-card">
    <h3>{title}</h3>
    <p>{value}</p>
  </div>
);

const Panel = ({ children }) => (
  <div className="panel">
    {children}
  </div>
);

const MiniBars = ({ data }) => (
  <div className="mini-bars">
    {data.map((item, index) => (
      <div key={index} className="mini-bar" style={{ height: item.value }} />
    ))}
  </div>
);

const DonutStatus = ({ percentage }) => (
  <div className="donut-status">
    <svg>
      <circle cx="50" cy="50" r="45" />
      <text x="50" y="50" textAnchor="middle">{percentage}%</text>
    </svg>
  </div>
);

const ActivityList = ({ activities }) => (
  <ul className="activity-list">
    {activities.map((activity, index) => (
      <li key={index}>{activity}</li>
    ))}
  </ul>
);

// Dashboard component
const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <Panel>
        <DashCard title="Sales" value="$10,000" />
        <DashCard title="Users" value="1,000" />
      </Panel>
      <MiniBars data={[{ value: 30 }, { value: 70 }, { value: 50 }]} />
      <DonutStatus percentage={75} />
      <ActivityList activities={["User1 logged in", "User2 made a purchase"]} />
    </div>
  );
};

export default Dashboard;