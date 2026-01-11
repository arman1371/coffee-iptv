import { useState } from "preact/hooks";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsOpen(false); // Close sidebar after navigation
  };

  const menuItems = [
    { id: "home", label: "Home" },
    { id: "configuration", label: "Configuration" },
  ];

  return (
    <>
      {/* Menu Button */}
      <button
        className="z-5 fixed left-4 top-4 cursor-pointer items-center rounded-full bg-black p-4 text-white"
        onClick={toggleSidebar}
        aria-label="Open navigation menu"
      >
        <div className="flex flex-col gap-1">
          <span className="block h-0.5 w-6 rounded-md bg-white" />
          <span className="block h-0.5 w-6 rounded-md bg-white" />
          <span className="block h-0.5 w-6 rounded-md bg-white" />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="z-15 fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 z-20 h-full w-80 bg-gray-800 text-white transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between bg-gray-900 p-5">
          <h2 className="font-semibold">Coffee IPTV</h2>
          <button
            className="cursor-pointer p-2"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1">
          <ul>
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full cursor-pointer p-5 text-left ${currentPage === item.label ? "border-l-4 bg-gray-600" : "bg-gray-800"}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
