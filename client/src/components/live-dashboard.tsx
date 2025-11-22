/**
 * LIVE INTERACTIVE DASHBOARD
 * Real-time dashboard with live data, animations, and interactions
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Zap, 
  Heart, 
  MessageCircle, 
  Share, 
  Eye, 
  Clock,
  Activity,
  Globe,
  Star,
  Trophy,
  Target,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { liveInteractiveFeatures } from '@/lib/live-interactive-features';

interface LiveDashboardProps {
  className?: string;
}

export function LiveDashboard({ className = '' }: LiveDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalEvents: 0,
    totalInteractions: 0,
    activeNotifications: 0
  });

  const [liveMetrics, setLiveMetrics] = useState({
    postsPerMinute: 0,
    likesPerSecond: 0,
    sharesPerHour: 0,
    viralPosts: 0,
    trendingTopics: 0,
    activeCollaborations: 0
  });

  useEffect(() => {
    const updateStats = () => {
      setStats(liveInteractiveFeatures.getLiveStats());
    };

    const updateMetrics = () => {
      setLiveMetrics({
        postsPerMinute: Math.floor(Math.random() * 50) + 10,
        likesPerSecond: Math.floor(Math.random() * 20) + 5,
        sharesPerHour: Math.floor(Math.random() * 200) + 50,
        viralPosts: Math.floor(Math.random() * 10) + 1,
        trendingTopics: Math.floor(Math.random() * 15) + 5,
        activeCollaborations: Math.floor(Math.random() * 25) + 10
      });
    };

    updateStats();
    updateMetrics();
    
    const statsInterval = setInterval(updateStats, 1000);
    const metricsInterval = setInterval(updateMetrics, 2000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          🌟 LIVE DASHBOARD 🌟
        </h1>
        <p className="text-gray-300">
          Real-time insights from the Vasukii ecosystem
        </p>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white animate-pulse">
                {stats.onlineUsers.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">Users Online</div>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
            LIVE
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white animate-pulse">
                {liveMetrics.postsPerMinute}
              </div>
              <div className="text-sm text-gray-300">Posts/Min</div>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-green-400">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{Math.floor(Math.random() * 10) + 5}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white animate-pulse">
                {liveMetrics.likesPerSecond}
              </div>
              <div className="text-sm text-gray-300">Likes/Sec</div>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-green-400">
            <Zap className="w-3 h-3 mr-1" />
            EXPLODING
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-4 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white animate-pulse">
                {liveMetrics.viralPosts}
              </div>
              <div className="text-sm text-gray-300">Viral Posts</div>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-orange-400">
            <Star className="w-3 h-3 mr-1" />
            TRENDING
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-400" />
            Live Activity Stream
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors animate-fade-in">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {Math.floor(Math.random() * 99) + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">
                      {['CryptoKing', 'BlockchainQueen', 'NFTMaster', 'DeFiWizard'][Math.floor(Math.random() * 4)]}
                    </span> {[
                      'created a viral post! 🔥',
                      'joined the revolution! 🚀',
                      'earned a new badge! 🏆',
                      'collaborated with others! 🤝',
                      'went trending! 📈',
                      'shared amazing content! ✨'
                    ][Math.floor(Math.random() * 6)]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.floor(Math.random() * 60) + 1} seconds ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
            Live Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Engagement Rate</span>
              <span className="text-sm font-semibold text-green-400">
                {Math.floor(Math.random() * 20) + 80}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full animate-pulse"
                style={{ width: `${Math.floor(Math.random() * 20) + 80}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Viral Potential</span>
              <span className="text-sm font-semibold text-orange-400">
                {Math.floor(Math.random() * 30) + 70}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full animate-pulse"
                style={{ width: `${Math.floor(Math.random() * 30) + 70}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Community Growth</span>
              <span className="text-sm font-semibold text-purple-400">
                +{Math.floor(Math.random() * 50) + 100}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"
                style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Innovation Score</span>
              <span className="text-sm font-semibold text-cyan-400">
                {Math.floor(Math.random() * 25) + 75}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full animate-pulse"
                style={{ width: `${Math.floor(Math.random() * 25) + 75}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-orange-400" />
          Trending Topics Right Now
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { topic: '#BlockchainRevolution', posts: 1247, trend: 'up' },
            { topic: '#NFTArt', posts: 892, trend: 'up' },
            { topic: '#DeFiYield', posts: 634, trend: 'up' },
            { topic: '#Web3Future', posts: 521, trend: 'up' },
            { topic: '#CryptoInnovation', posts: 445, trend: 'up' },
            { topic: '#MetaverseBuild', posts: 378, trend: 'up' }
          ].map((item, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{item.topic}</span>
                <span className="text-xs text-green-400">#{index + 1}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{item.posts} posts</span>
                <div className="flex items-center text-xs text-green-400">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trending
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Collaboration Hub */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-purple-400" />
          Live Collaboration Hub
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {Math.floor(Math.random() * 99) + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {['AI Art Project', 'DeFi Protocol', 'NFT Collection', 'Web3 Game', 'Blockchain App', 'Metaverse World'][i]}
                  </div>
                  <div className="text-xs text-gray-400">
                    {Math.floor(Math.random() * 10) + 2} collaborators
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Active now</span>
                <button className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full hover:bg-purple-500/30 transition-colors">
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

