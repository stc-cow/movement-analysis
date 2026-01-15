import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, MapPin, Calendar, Package } from "lucide-react";

interface Movement {
  id: string;
  cowId: string;
  from: string;
  to: string;
  date: string;
  description: string;
}

export default function AIMovement() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([
    {
      id: "1",
      cowId: "COW-001",
      from: "Warehouse A",
      to: "Warehouse B",
      date: "2024-01-15",
      description: "Regular transfer",
    },
    {
      id: "2",
      cowId: "COW-002",
      from: "Hub East",
      to: "Hub West",
      date: "2024-01-16",
      description: "Distribution",
    },
  ]);

  const [formData, setFormData] = useState({
    cowId: "",
    from: "",
    to: "",
    date: "",
    description: "",
  });

  const handleAddMovement = () => {
    if (!formData.cowId || !formData.from || !formData.to || !formData.date) {
      alert("Please fill in all required fields");
      return;
    }

    const newMovement: Movement = {
      id: Date.now().toString(),
      ...formData,
    };

    setMovements([...movements, newMovement]);
    setFormData({ cowId: "", from: "", to: "", date: "", description: "" });
  };

  const handleDeleteMovement = (id: string) => {
    setMovements(movements.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">AI Movement Tracker</h1>
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Create Movement Section */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-8 border border-blue-400/20 mb-12">
          <h2 className="text-2xl font-bold mb-6">Create New Movement</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">COW ID *</label>
              <input
                type="text"
                placeholder="e.g., COW-001"
                value={formData.cowId}
                onChange={(e) =>
                  setFormData({ ...formData, cowId: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                From Location *
              </label>
              <input
                type="text"
                placeholder="e.g., Warehouse A"
                value={formData.from}
                onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                To Location *
              </label>
              <input
                type="text"
                placeholder="e.g., Warehouse B"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                placeholder="Add notes about this movement..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <Button
            onClick={handleAddMovement}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full md:w-auto"
          >
            <Plus className="w-5 h-5" /> Add Movement
          </Button>
        </div>

        {/* Movements List */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Movement History</h2>

          {movements.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <Package className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400">No movements recorded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-lg p-6 border border-slate-700/50 hover:border-blue-500/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold text-blue-400">
                          {movement.cowId}
                        </span>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          {movement.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-400" />
                          <div>
                            <p className="text-slate-400">From</p>
                            <p className="font-medium">{movement.from}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-400" />
                          <div>
                            <p className="text-slate-400">To</p>
                            <p className="font-medium">{movement.to}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-slate-400">Date</p>
                            <p className="font-medium">
                              {new Date(movement.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {movement.description && (
                        <p className="text-slate-400 text-sm mt-3 italic">
                          {movement.description}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMovement(movement.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-6 border border-blue-400/20">
            <p className="text-slate-400 text-sm">Total Movements</p>
            <p className="text-3xl font-bold text-blue-400">{movements.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-400/20">
            <p className="text-slate-400 text-sm">Unique COWs</p>
            <p className="text-3xl font-bold text-purple-400">
              {new Set(movements.map((m) => m.cowId)).size}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-lg p-6 border border-green-400/20">
            <p className="text-slate-400 text-sm">Locations Used</p>
            <p className="text-3xl font-bold text-green-400">
              {new Set([
                ...movements.map((m) => m.from),
                ...movements.map((m) => m.to),
              ]).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
