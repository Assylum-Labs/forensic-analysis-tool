import React from 'react';

const DepthControl = ({ 
  depth = 1, 
  maxDepth = 5, 
  onChange, 
  className = "" 
}) => {
  const handleDepthChange = (e) => {
    const newDepth = parseInt(e.target.value);
    if (onChange) onChange(newDepth);
  };

  return (
    <div className={`p-2 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Network Depth</label>
        <div className="px-2 py-1 bg-muted rounded-md text-sm font-medium">
          Depth: {depth}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max={maxDepth}
          value={depth}
          onChange={handleDepthChange}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div className="text-xs text-muted-foreground mt-1">
        {depth === 1 
          ? 'Direct interactions only' 
          : depth === 2 
            ? 'Includes accounts connected to direct contacts' 
            : `Shows up to ${depth} hops from origin`}
      </div>
    </div>
  );
};

export default DepthControl;