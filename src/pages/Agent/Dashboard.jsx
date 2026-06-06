import React, { useState } from 'react';
import './Dashboard.css';

export const Dashboard = ({ agentName, stats, applications = [], properties = [], tenantById = new Map(), userRow }) => {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Verify Sarah J's income", priority: "High Priority", color: "error", completed: false },
    { id: 2, title: "Draft lease for Unit 12B", priority: "Completed", color: "surface-variant", completed: true },
    { id: 3, title: "Schedule 3 viewings for Lofts", priority: "Tomorrow", color: "primary", completed: false },
    { id: 4, title: "Follow up with matches", priority: "Today", color: "secondary", completed: false }
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden text-[#e1e2ed] w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* TopNavBar */}
      <header className="h-16 flex justify-between items-center w-full px-md bg-surface-dim bottom-border z-40">
        <div className="flex items-center gap-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="bg-surface-container-lowest border border-outline-variant rounded-full pl-10 pr-4 py-1.5 text-body-md w-80 focus:outline-none focus:border-primary transition-all text-on-surface" 
              placeholder="Search applications or properties..." 
              type="text" 
            />
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button className="flex items-center gap-xs text-primary font-bold px-4 py-1.5 hover:bg-surface-variant rounded-lg transition-colors duration-200 cursor-pointer">
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-label-md">Add Listing</span>
          </button>
          <button className="flex items-center gap-xs bg-primary-container text-on-primary-container px-4 py-1.5 rounded-lg font-bold hover:brightness-105 active:opacity-80 transition-all cursor-pointer">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-label-md">Match Tenant</span>
          </button>
          <div className="h-6 w-px bg-outline-variant"></div>
          <div className="flex gap-sm">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">calendar_today</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors relative">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">settings</span>
            </button>
          </div>
          <div className="flex items-center gap-sm cursor-pointer hover:bg-surface-variant p-1 rounded-full transition-all">
            {userRow?.profile_picture ? (
              <img 
                alt="Agent Profile" 
                className="w-8 h-8 rounded-full object-cover" 
                src={userRow.profile_picture} 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {(agentName || "A")[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-gutter bg-surface-dim relative">
        {/* Key Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-gutter relative z-10">
          <div className="glass-card p-md rounded-xl hover:border-primary/50 transition-all cursor-default">
            <div className="flex justify-between items-start mb-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">description</span>
              </div>
              <span className="text-secondary text-label-sm flex items-center gap-xs bg-secondary/10 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 12%
              </span>
            </div>
            <p className="text-on-surface-variant text-label-md font-medium">New Applications</p>
            <h3 className="text-headline-md font-bold mt-xs">{stats?.[0]?.value || 0}</h3>
          </div>
          <div className="glass-card p-md rounded-xl hover:border-primary/50 transition-all cursor-default">
            <div className="flex justify-between items-start mb-sm">
              <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">handshake</span>
              </div>
              <span className="text-error text-label-sm flex items-center gap-xs bg-error/10 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">trending_down</span> 4%
              </span>
            </div>
            <p className="text-on-surface-variant text-label-md font-medium">Total Applications</p>
            <h3 className="text-headline-md font-bold mt-xs">{stats?.[1]?.value || 0}</h3>
          </div>
          <div className="glass-card p-md rounded-xl hover:border-primary/50 transition-all cursor-default">
            <div className="flex justify-between items-start mb-sm">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">home_work</span>
              </div>
              <span className="text-secondary text-label-sm flex items-center gap-xs bg-secondary/10 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 8%
              </span>
            </div>
            <p className="text-on-surface-variant text-label-md font-medium">Active Listings</p>
            <h3 className="text-headline-md font-bold mt-xs">{stats?.[2]?.value || 0}</h3>
          </div>
          <div className="glass-card p-md rounded-xl hover:border-primary/50 transition-all cursor-default">
            <div className="flex justify-between items-start mb-sm">
              <div className="w-10 h-10 rounded-lg bg-on-surface-variant/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">chat</span>
              </div>
              <span className="text-secondary text-label-sm flex items-center gap-xs bg-secondary/10 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 22%
              </span>
            </div>
            <p className="text-on-surface-variant text-label-md font-medium">Tenants Reached</p>
            <h3 className="text-headline-md font-bold mt-xs">{stats?.[3]?.value || 0}</h3>
          </div>
        </section>

        {/* Main Workspace Grid */}
        <section className="grid grid-cols-12 gap-gutter mb-gutter relative z-10">
          {/* Left: Recent Applications */}
          <div className="col-span-12 lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col">
            <div className="p-md flex justify-between items-center bottom-border bg-surface-container-low/50">
              <h2 className="text-headline-sm font-bold">Recent Applications</h2>
              <button className="text-primary text-label-md hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-lowest/50 text-on-surface-variant text-label-sm uppercase">
                  <tr>
                    <th className="px-md py-4 font-medium">Tenant</th>
                    <th className="px-md py-4 font-medium">Budget</th>
                    <th className="px-md py-4 font-medium">Preferred Area</th>
                    <th className="px-md py-4 text-center font-medium">Score</th>
                    <th className="px-md py-4 font-medium">Status</th>
                    <th className="px-md py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {applications.slice(0, 5).map(app => {
                    const tenant = tenantById.get(app.tenant_id) || {};
                    const property = properties.find(p => p.id === app.property_id);
                    return (
                      <tr key={app.id} className="hover:bg-surface-container-high/40 transition-colors">
                        <td className="px-md py-4">
                          <div className="flex items-center gap-sm">
                            {tenant.profile_picture ? (
                              <img alt="Tenant" className="w-8 h-8 rounded-full object-cover" src={tenant.profile_picture} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {(tenant.full_name || tenant.email || "T")[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-body-md font-medium">{tenant.full_name || tenant.email || "Unknown Tenant"}</span>
                          </div>
                        </td>
                        <td className="px-md py-4 text-body-md">${app.budget || property?.price || "N/A"}/mo</td>
                        <td className="px-md py-4 text-body-md">{property ? (property.city || "Various") : "Any"}</td>
                        <td className="px-md py-4">
                          <div className="flex justify-center">
                            <span className="bg-secondary/20 text-secondary text-label-sm font-bold px-3 py-1 rounded-full border border-secondary/30">
                              {Math.floor(Math.random() * 15 + 85)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-md py-4">
                          <span className={`flex items-center gap-xs capitalize ${app.status === 'approved' ? 'text-secondary' : 'text-primary'}`}>
                            {(app.status === 'approved' || app.status === 'reviewing') ? <span className={`w-2 h-2 rounded-full ${app.status === 'approved' ? 'bg-secondary' : 'bg-primary'}`}></span> : null}
                            {app.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-md py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button className="w-8 h-8 rounded bg-surface-variant hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-all"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                            <button className="w-8 h-8 rounded bg-surface-variant hover:bg-secondary/20 hover:text-secondary flex items-center justify-center transition-all"><span className="material-symbols-outlined text-[18px]">handshake</span></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {applications.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-md py-8 text-center text-on-surface-variant text-body-md">
                        No recent applications
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: AI Matching Opportunities */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-xl flex flex-col">
            <div className="p-md bottom-border bg-surface-container-low/50">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-bold flex items-center gap-xs">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI Matches
                </h2>
                <span className="bg-secondary/10 text-secondary text-label-sm px-2 py-1 rounded-lg font-bold">High Confidence</span>
              </div>
            </div>
            <div className="p-md flex flex-col gap-md">
              {applications.slice(0, 3).map((app, i) => {
                const tenant = tenantById.get(app.tenant_id) || {};
                const prop = properties.find(p => p.id === app.property_id);
                if (!prop) return null;
                return (
                  <div key={app.id} className="p-sm rounded-lg bg-surface-container-highest/40 border border-outline-variant hover:border-secondary/50 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-sm">
                      <div>
                        <h4 className="text-body-md font-bold">{tenant.full_name || tenant.email || "Unknown"}</h4>
                        <p className="text-label-sm text-on-surface-variant">Match for: {prop.title}</p>
                      </div>
                      <span className="text-secondary font-bold">{Math.floor(Math.random() * 5 + 90)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-md font-medium text-primary">${app.budget || prop.price}/mo</span>
                      <button className="bg-primary-container text-on-primary-container text-label-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">Contact</button>
                    </div>
                  </div>
                );
              })}
              {applications.length === 0 && (
                <div className="text-center text-on-surface-variant text-body-md py-4">No AI Matches</div>
              )}
            </div>
          </div>
        </section>

        {/* Operational Panels Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter pb-xl relative z-10">
          {/* Active Listings */}
          <div className="glass-card rounded-xl flex flex-col h-full">
            <div className="p-md flex justify-between items-center bottom-border">
              <h2 className="text-headline-sm font-bold">Active Listings</h2>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">more_vert</button>
            </div>
            <div className="p-md flex flex-col gap-sm flex-1">
              {properties.slice(0, 3).map(prop => {
                const numApps = applications.filter(a => a.property_id === prop.id).length;
                return (
                  <div key={prop.id} className="flex gap-md group cursor-pointer">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container-highest">
                      {prop.images?.[0] ? (
                        <img alt="Listing" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={prop.images[0]} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-[32px]">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-body-md font-bold group-hover:text-primary transition-colors">{prop.title}</h4>
                      <p className="text-label-sm text-on-surface-variant">{prop.city || prop.address}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-primary font-bold">${prop.price}</span>
                        <span className="text-label-sm bg-surface-variant px-2 py-0.5 rounded">{numApps} Applicants</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {properties.length === 0 && (
                <div className="text-center text-on-surface-variant text-body-md py-4">No active listings</div>
              )}
            </div>
          </div>

          {/* Communication Centre */}
          <div className="glass-card rounded-xl flex flex-col h-full">
            <div className="p-md flex justify-between items-center bottom-border">
              <h2 className="text-headline-sm font-bold">Messages</h2>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">edit_square</button>
            </div>
            <div className="flex flex-col flex-1">
              <div className="p-md hover:bg-surface-container-high/50 cursor-pointer transition-all border-l-4 border-primary bg-primary/5">
                <div className="flex gap-sm">
                  <img alt="User" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZlYNlSYEyT-FrNY-Jq7gbYc6ibIfQ4kaUo_b1cTxZT0h_R8I39AhjjtRBq0B0xH-mt3T-LpdUModd52fhyioVOcg7vFeRsfiiu7p6HJCKs3MoVnsjBOIHZeG9DfgI9oWXeK-fu-VXz8ad7E2C_h5SZMQdBFEJ2VPh0yz7hfoqWLaxMWK892v7smGEhe0NZ74RRa2VDn8GaLP6nxCaGQZQ9pT35JBC7B1U384jglbZoEhn__XvL2_kUg41rS6dSE4UKWjzFP_sP6g" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-body-md font-bold">Julia Vance</h4>
                      <span className="text-label-sm text-on-surface-variant">2m ago</span>
                    </div>
                    <p className="text-label-md text-on-surface truncate">I'd like to schedule the viewing for Lo...</p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Task Queue */}
          <div className="glass-card rounded-xl flex flex-col h-full">
            <div className="p-md flex justify-between items-center bottom-border">
              <h2 className="text-headline-sm font-bold">Task Queue</h2>
              <span className="bg-tertiary/20 text-tertiary text-label-sm px-2 py-0.5 rounded-lg font-bold">4 Priority</span>
            </div>
            <div className="p-md flex flex-col gap-sm">
              {tasks.map(task => (
                <div key={task.id} className={`flex items-center gap-md group ${task.completed ? 'opacity-60' : ''}`}>
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-outline-variant hover:border-primary'}`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${task.completed ? 'text-on-primary' : 'text-primary hidden group-hover:block'}`} style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                  </button>
                  <div className="flex-1">
                    <p className={`text-body-md font-medium ${task.completed ? 'line-through text-on-surface-variant' : ''}`}>{task.title}</p>
                    <span className={`text-label-sm bg-${task.color}/10 text-${task.color} px-2 py-0.5 rounded font-medium`}>{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Floating Action Effect */}
        <div className="fixed bottom-gutter right-gutter pointer-events-none z-0">
          <div className="w-32 h-32 bg-primary/10 blur-[64px] rounded-full"></div>
        </div>

      </div>
    </div>
  );
};
