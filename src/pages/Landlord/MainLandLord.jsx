import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { globalStyle, T } from './styles/designTokens';
import { Sidebar } from './SideBar';
import { Dashboard } from './Dashboard';
import { MyProperties } from './MyProperties';
import { Messages } from './Messages';
import { Profile } from './Profile';
import { properties as initialProperties, messages as initialMessages, stats } from './data/mockData';

export default function MainLandlord() {
  const [activeView, setActiveView] = useState("dashboard");
  const [properties, setProperties] = useState(initialProperties);
  const [messages, setMessages] = useState(initialMessages);
  const [unreadCount] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleAddProperty = () => {
    console.log("Add new property");
  };

  const handleEditProperty = (updatedProperty) => {
    setProperties(properties.map(p => 
      p.id === updatedProperty.id ? updatedProperty : p
    ));
  };

  const handleViewDetails = (property) => {
    console.log("View details:", property);
  };

  const handleSendReply = (id, reply) => {
    console.log(`Sending reply to message ${id}: ${reply}`);
  };

  const handleMarkAllRead = () => {
    console.log("Mark all messages as read");
  };

  const handleLogout = () => {
    console.log("Logging out...");
  };

  const renderContent = () => {
    switch(activeView) {
      case "dashboard":
        return <Dashboard />;
      case "profile":
        return <Profile />;
      case "properties":
        return (
          <MyProperties 
            properties={properties}
            stats={stats}
            onAddProperty={handleAddProperty}
            onEditProperty={handleEditProperty}
            onViewDetails={handleViewDetails}
          />
        );
      case "messages":
        return (
          <Messages 
            messages={messages}
            onSendReply={handleSendReply}
            onMarkAllRead={handleMarkAllRead}
          />
        );
      default:
        return (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: T.textPrimary }}>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2>
            <p style={{ color: T.textMuted, marginTop: "1rem" }}>Coming soon...</p>
          </div>
        );
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar - Fixed on desktop, modal on mobile */}
        {!isMobile && (
          <Sidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            unreadCount={unreadCount}
            onLogout={handleLogout}
          />
        )}

        {/* Mobile Sidebar Modal */}
        {isMobile && isMobileMenuOpen && (
          <>
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 98,
                animation: "fadeIn 0.2s ease-in-out"
              }}
            />
            <div style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 99,
              animation: "slideIn 0.3s ease-in-out"
            }}>
              <Sidebar 
                activeView={activeView}
                setActiveView={(view) => {
                  setActiveView(view);
                  setIsMobileMenuOpen(false);
                }}
                unreadCount={unreadCount}
                onLogout={handleLogout}
              />
            </div>
          </>
        )}

        {/* Main Content - With left margin on desktop to account for fixed sidebar */}
        <main style={{
          flex: 1,
          marginLeft: isMobile ? 0 : "260px",
          padding: "2rem 1.5rem",
          width: isMobile ? "100%" : `calc(100% - 260px)`,
          minHeight: "100vh"
        }}>
          {/* Mobile Top Bar */}
          {isMobile && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              paddingBottom: "1rem",
              borderBottom: `1px solid ${T.border}`
            }}>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  padding: "8px",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Menu size={20} color={T.textSecondary} />
              </button>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#fff"
                }}>JD</div>
              </div>
            </div>
          )}
          
          {renderContent()}
        </main>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}