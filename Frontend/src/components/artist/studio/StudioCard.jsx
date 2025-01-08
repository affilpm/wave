const StudioCard = ({ children, className = '', onClick = () => {} }) => (
    <div 
      onClick={onClick}
      className={`bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all ${className}`}
    >
      {children}
    </div>
  );

export default StudioCard