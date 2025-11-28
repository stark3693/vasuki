import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ReactionCount {
  emoji: string;
  count: number;
}

interface ReactionDisplayProps {
  reactions: { [emoji: string]: number };
  userReaction?: string | null;
  onReactionClick?: (emoji: string) => void;
}

export function ReactionDisplay({ reactions, userReaction, onReactionClick }: ReactionDisplayProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  const reactionCounts: ReactionCount[] = Object.entries(reactions || {})
    .map(([emoji, count]) => ({ emoji, count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  if (reactionCounts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <AnimatePresence mode="popLayout">
        {reactionCounts.map(({ emoji, count }) => {
          const isUserReaction = userReaction === emoji;
          const isPremium = ['🚀', '💎', '⚡', '🎯', '👑'].includes(emoji);

          return (
            <motion.button
              key={emoji}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onReactionClick?.(emoji)}
              onMouseEnter={() => setHoveredEmoji(emoji)}
              onMouseLeave={() => setHoveredEmoji(null)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium
                transition-all cursor-pointer relative
                ${isUserReaction 
                  ? 'bg-primary/20 text-primary ring-2 ring-primary/50' 
                  : 'bg-accent hover:bg-accent/80'
                }
                ${isPremium ? 'shadow-lg' : ''}
              `}
            >
              {/* Premium sparkle effect */}
              {isPremium && (
                <motion.span
                  className="absolute -top-1 -right-1 text-[10px]"
                  animate={{ 
                    rotate: [0, 10, 0, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ✨
                </motion.span>
              )}

              {/* Emoji with bounce animation when hovered */}
              <motion.span
                animate={hoveredEmoji === emoji ? {
                  y: [0, -4, 0],
                  scale: [1, 1.2, 1]
                } : {}}
                transition={{ duration: 0.3 }}
                className="text-base"
              >
                {emoji}
              </motion.span>

              {/* Count */}
              <span className={`text-xs ${isUserReaction ? 'font-bold' : ''}`}>
                {count}
              </span>

              {/* Floating particles on hover */}
              {hoveredEmoji === emoji && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 0, x: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        y: [-10, -20],
                        x: [0, (i - 1) * 10]
                      }}
                      transition={{ 
                        duration: 0.8,
                        delay: i * 0.1,
                        repeat: Infinity
                      }}
                      className="absolute text-xs pointer-events-none"
                      style={{ top: '50%', left: '50%' }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
