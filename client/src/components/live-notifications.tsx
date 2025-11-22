/**
 * LIVE NOTIFICATIONS COMPONENT
 * Shows real-time notifications that appear and disappear dynamically
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, TrendingUp, Trophy, Zap, Heart, Users, Star } from 'lucide-react';
import { liveInteractiveFeatures, LiveNotification } from '@/lib/live-interactive-features';

interface LiveNotificationsProps {
  className?: string;
}

export function LiveNotifications({ className = '' }: LiveNotificationsProps) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Subscribe to live notifications
    const unsubscribe = liveInteractiveFeatures.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 notifications
      
      // Auto-remove notification after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notification.duration);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white animate-pulse">✅</div>;
      case 'warning': return <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white animate-pulse">⚠️</div>;
      case 'info': return <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">ℹ️</div>;
      case 'achievement': return <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white animate-pulse">🏆</div>;
      case 'trending': return <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white animate-pulse">🔥</div>;
      default: return <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white animate-pulse">✨</div>;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'achievement': return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20';
      case 'trending': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            relative p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-500 ease-in-out
            animate-slide-in-right hover:scale-105 cursor-pointer
            ${getNotificationStyle(notification.type)}
          `}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="flex items-start space-x-3">
            {getNotificationIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {notification.title}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {notification.message}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center space-x-1">
                  <Bell className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">LIVE</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-progress-bar"
              style={{
                animationDuration: `${notification.duration}ms`,
                animationTimingFunction: 'linear'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * LIVE ACTIVITY FEED COMPONENT
 * Shows real-time activity happening on the platform
 */
export function LiveActivityFeed({ className = '' }: { className?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Subscribe to live events
    const unsubscribe = liveInteractiveFeatures.subscribeToEvents((event) => {
      setEvents(prev => [event, ...prev.slice(0, 19)]); // Keep only 20 events
      
      // Auto-remove event after 30 seconds
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e.id !== event.id));
      }, 30000);
    });

    return unsubscribe;
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return <Users className="w-4 h-4 text-green-500" />;
      case 'post_created': return <Star className="w-4 h-4 text-blue-500" />;
      case 'like_burst': return <Heart className="w-4 h-4 text-red-500" />;
      case 'trending_alert': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'viral_moment': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'collaboration': return <Users className="w-4 h-4 text-purple-500" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-600" />;
      default: return <Star className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isVisible || events.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
          LIVE ACTIVITY
        </h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors animate-fade-in"
          >
            {getEventIcon(event.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">{event.userName}</span> {event.message}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <div className="inline-flex items-center space-x-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates every 3 seconds</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LIVE USER COUNTER COMPONENT
 * Shows real-time user count and activity
 */
export function LiveUserCounter({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalEvents: 0,
    totalInteractions: 0,
    activeNotifications: 0
  });

  useEffect(() => {
    const updateStats = () => {
      setStats(liveInteractiveFeatures.getLiveStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/10 rounded-lg p-4 ${className}`}>
      <div className="text-center">
        <div className="text-2xl font-bold text-white mb-2">
          {stats.onlineUsers.toLocaleString()}
        </div>
        <div className="text-sm text-gray-300 mb-4">
          Users Online Right Now
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-white font-semibold">{stats.totalUsers}</div>
            <div className="text-gray-400">Total Users</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-white font-semibold">{stats.totalEvents}</div>
            <div className="text-gray-400">Live Events</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-white font-semibold">{stats.totalInteractions}</div>
            <div className="text-gray-400">Interactions</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-white font-semibold">{stats.activeNotifications}</div>
            <div className="text-gray-400">Notifications</div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}

