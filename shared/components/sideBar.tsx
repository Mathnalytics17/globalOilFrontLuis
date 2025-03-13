import React, { useState } from "react";
import { FiChevronDown, FiFolder, FiPieChart, FiActivity } from "react-icons/fi";
import Link from "next/link";
import "./Sidebar.css";

const Sidebar = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    encuotas: false,
    vision: false,
    priorizacion: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="sidebar-container">
      <h1 className="sidebar-title">GlobalIsc</h1>
      <div className="menu-section">
        <div className="menu-header">
        <Link href={'/administrationPanel'} className="menu-header">
          <FiFolder className="icon" />
          Panel de adminstración
         </Link>
         
        </div>
        
      </div>
      <div className="menu-section">
        <Link href={'/activesTree'} className="menu-header">
          <FiFolder className="icon" />
          Árbol de Activos
        </Link>
      </div>

      <div className="menu-section">
        <div className="menu-header">
        <Link href={'/activesTree/analisisAceite'} className="menu-header">
          <FiFolder className="icon" />
         Análisis de aceite
         </Link>
         
        </div>
        
      </div>

      <div className="menu-section">
        <div className="menu-header" onClick={() => toggleSection("vision")}>

        <Link href={'/dashboard'} className="menu-header">
        <FiPieChart className="icon" />
        DashBoard
         </Link>
          
         
        </div>
        
      </div>

      <div className="menu-section">
        <div className="menu-header" onClick={() => toggleSection("priorizacion")}>
          <FiActivity className="icon" />
          Reportes
          <FiChevronDown className={`chevron ${openSections.priorizacion ? "rotate" : ""}`} />
        </div>
      
      </div>
    </div>
  );
};

export default Sidebar;
