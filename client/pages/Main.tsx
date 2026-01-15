import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, MessageCircle, Zap, TrendingUp } from "lucide-react";

export default function Main() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/50 border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AI Analytics
            </span>
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Intelligent Analytics with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              AI & Machine Learning
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Harness the power of advanced machine learning and real-time chatbot AI to unlock insights from your data. Make smarter decisions faster.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate("/ai-movement")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-lg h-12 px-8"
            >
              AI Movement <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => navigate("/ai-chat")}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-lg h-12 px-8"
            >
              AI Chat Agent <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-400/20 backdrop-blur-sm hover:border-blue-400/40 transition-all">
            <TrendingUp className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="text-2xl font-bold mb-2">98%</h3>
            <p className="text-slate-300">Prediction Accuracy</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-400/20 backdrop-blur-sm hover:border-purple-400/40 transition-all">
            <Zap className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-2xl font-bold mb-2">Real-time</h3>
            <p className="text-slate-300">Data Processing</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-6 border border-blue-400/20 backdrop-blur-sm hover:border-blue-400/40 transition-all">
            <MessageCircle className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-2xl font-bold mb-2">24/7</h3>
            <p className="text-slate-300">AI Chat Support</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 px-6 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Powered by ACES MSD
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ML Features */}
            <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-xl p-8 border border-blue-400/20">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-bold">Machine Learning</h3>
              </div>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Predictive analytics powered by neural networks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Pattern recognition and anomaly detection</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Automated data clustering and segmentation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span>Real-time model training and optimization</span>
                </li>
              </ul>
            </div>

            {/* AI Chatbot Features */}
            <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl p-8 border border-purple-400/20">
              <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="w-8 h-8 text-purple-400" />
                <h3 className="text-2xl font-bold">AI Chatbot</h3>
              </div>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Natural language processing for instant queries</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Context-aware responses with deep understanding</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Multi-language support for global teams</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400 mt-1">✓</span>
                  <span>Continuous learning from user interactions</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Additional Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-700/40 rounded-lg p-6 border border-slate-600/40">
              <h4 className="font-bold text-lg mb-3">Smart Insights</h4>
              <p className="text-slate-400">Automatically generate actionable insights from complex datasets</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-6 border border-slate-600/40">
              <h4 className="font-bold text-lg mb-3">Predictive Models</h4>
              <p className="text-slate-400">Forecast future trends with high accuracy ML models</p>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-6 border border-slate-600/40">
              <h4 className="font-bold text-lg mb-3">Data Visualization</h4>
              <p className="text-slate-400">Beautiful, interactive charts and dashboards</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-12 border border-blue-400/30 backdrop-blur-sm">
          <h2 className="text-4xl font-bold mb-6">Explore AI Features</h2>
          <p className="text-xl text-slate-300 mb-8">
            Try our AI-powered tools to track movements and ask questions with our intelligent chat agent.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>© 2024 AI Analytics Platform. Powered by Machine Learning & Advanced AI.</p>
        </div>
      </footer>
    </div>
  );
}
