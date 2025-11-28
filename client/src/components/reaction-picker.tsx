import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ReactionPickerProps {
  onReact: (emoji: string, isPremium: boolean) => void;
  currentReaction?: string | null;
}

// Free reactions
const FREE_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🤔", label: "Think" },
  { emoji: "💯", label: "Perfect" },
];

// Premium reactions (10 VSK each)
const PREMIUM_REACTIONS = [
  { emoji: "🚀", label: "Rocket" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "⚡", label: "Lightning" },
  { emoji: "🎯", label: "Target" },
  { emoji: "👑", label: "Crown" },
];

export function ReactionPicker({ onReact, currentReaction }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const handleReaction = (emoji: string, isPremium: boolean) => {
    onReact(emoji, isPremium);
    setShowPicker(false);
    setShowPremium(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        className={`gap-1 ${currentReaction ? 'text-primary' : ''}`}
      >
        {currentReaction || "😊"} React
      </Button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 bg-card border-2 border-primary/20 rounded-xl shadow-2xl p-3 z-50 min-w-[280px]"
          >
            {/* Free Reactions */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Reactions</p>
              <div className="grid grid-cols-6 gap-2">
                {FREE_REACTIONS.map(({ emoji, label }) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(emoji, false)}
                    className={`text-2xl hover:bg-accent rounded-lg p-2 transition-colors ${
                      currentReaction === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                    }`}
                    title={label}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Premium Section Toggle */}
            <div className="border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPremium(!showPremium)}
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Premium Reactions
                </span>
                <span className="text-primary font-semibold">10 VSK</span>
              </Button>

              <AnimatePresence>
                {showPremium && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-5 gap-2 mt-3 p-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                      {PREMIUM_REACTIONS.map(({ emoji, label }) => (
                        <motion.button
                          key={emoji}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReaction(emoji, true)}
                          className={`text-2xl hover:bg-accent rounded-lg p-2 transition-colors relative ${
                            currentReaction === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                          }`}
                          title={`${label} (10 VSK)`}
                        >
                          {emoji}
                          {currentReaction !== emoji && (
                            <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              💎
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Remove Reaction */}
            {currentReaction && (
              <div className="border-t border-border pt-3 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction('', false)}
                  className="w-full text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove Reaction
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
