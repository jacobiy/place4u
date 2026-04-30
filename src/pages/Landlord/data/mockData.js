export const properties = [
    { 
      id:1, 
      name:"Sunset Apartments Unit 3A", 
      location:"Cape Town CBD", 
      rent:"R8,500/mo", 
      image:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400", 
      bedrooms:2, 
      bathrooms:1, 
      size:"75m²", 
      occupied:true, 
      tenants:["John Doe","Jane Smith"] 
    },
    { 
      id:2, 
      name:"Garden Flat Rosebank", 
      location:"Rondebosch", 
      rent:"R6,200/mo", 
      image:"https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400", 
      bedrooms:1, 
      bathrooms:1, 
      size:"45m²", 
      occupied:false, 
      tenants:[] 
    },
    { 
      id:3, 
      name:"Harbour View Apartment", 
      location:"Sea Point", 
      rent:"R12,000/mo", 
      image:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400", 
      bedrooms:3, 
      bathrooms:2, 
      size:"110m²", 
      occupied:true, 
      tenants:["Mike Johnson"] 
    }
  ];
  
  export const messages = [
    { 
      id:1, 
      sender:"John Doe", 
      role:"Tenant · Sunset Apartments", 
      message:"Hello, I wanted to report an issue with the water pressure in the kitchen. It seems lower than usual. Can you please arrange for a plumber to check it?", 
      date:"23 Mar", 
      attachments:[] 
    },
    { 
      id:2, 
      sender:"Jane Smith", 
      role:"Tenant · Sunset Apartments", 
      message:"Hi! Just confirming that the rent payment for this month has been processed. Please let me know if you have received it.", 
      date:"22 Mar", 
      attachments:[] 
    },
    { 
      id:3, 
      sender:"Mike Johnson", 
      role:"Tenant · Harbour View", 
      message:"Good day, I have a maintenance request for the HVAC system. The unit is not cooling properly and making unusual noises.", 
      date:"21 Mar", 
      attachments:["photo.jpg"] 
    },
    { 
      id:4, 
      sender:"Sarah Williams", 
      role:"Prospective Tenant", 
      message:"I viewed the Garden Flat yesterday and I am very interested. Could we arrange a follow-up meeting to discuss the lease terms?", 
      date:"20 Mar", 
      attachments:[] 
    }
  ];
  
  export const stats = [
    { label:"Monthly Income",  value:"R26,700", change:"+8%", trend:"up", icon: "DollarSign" },
    { label:"Occupancy Rate",  value:"67%",     change:"+5%", trend:"up", icon: "Home" },
    { label:"Total Properties",value:"3",       change:"–",   trend:"neutral", icon: "Building" },
    { label:"Active Tenants",  value:"3",       change:"+1",  trend:"up", icon: "Users" },
  ];