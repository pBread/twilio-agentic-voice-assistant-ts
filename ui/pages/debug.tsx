import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Row {
  id: number;
  name: string;
  value: number;
}

const AnimatedTable: React.FC = () => {
  const [data, setData] = useState<Row[]>([]); // Ensuring default empty array

  // Simulating API fetch
  useEffect(() => {
    setTimeout(() => {
      setData([
        { id: 1, name: "Alice", value: 10 },
        { id: 2, name: "Bob", value: 20 },
        { id: 3, name: "Charlie", value: 30 },
      ]);
    }, 1000); // Simulating network delay
  }, []);

  const shuffleData = () => {
    setData([...data].sort(() => Math.random() - Math.random()));
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <button
        onClick={shuffleData}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Shuffle Rows
      </button>
      <div className="border border-gray-300 rounded-md w-80">
        <div className="grid grid-cols-3 bg-gray-200 font-bold p-2">
          <div>ID</div>
          <div>Name</div>
          <div>Value</div>
        </div>
        <AnimatePresence>
          {data.length > 0 ? (
            data.map((row) => (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="grid grid-cols-3 p-2 border-b"
              >
                <div>{row.id}</div>
                <div>{row.name}</div>
                <div>{row.value}</div>
              </motion.div>
            ))
          ) : (
            <p className="text-center p-2">Loading...</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen">
      <AnimatedTable />
    </div>
  );
}
