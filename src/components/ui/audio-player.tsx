"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const formatTime = (seconds: number = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const CustomSlider = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn(
        "relative w-full h-1 bg-white/20 rounded-full cursor-pointer",
        className
      )}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <motion.div
        className="absolute top-0 left-0 h-full bg-white rounded-full"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
};

/**
 * The HandJam music player. Same look as the original audio-player component, but it drives
 * the remix deck (which plays through Web Audio) instead of an <audio> element.
 */
export interface AudioPlayerProps {
  title: string;
  subtitle?: string;
  cover?: React.ReactNode;
  isPlaying: boolean;
  loading?: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: boolean;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: (on: boolean) => void;
  onRepeat: (on: boolean) => void;
  className?: string;
}

const iconBtn = "text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 rounded-full";

const AudioPlayer = ({
  title,
  subtitle,
  cover,
  isPlaying,
  loading,
  currentTime,
  duration,
  shuffle,
  repeat,
  onToggle,
  onSeek,
  onPrev,
  onNext,
  onShuffle,
  onRepeat,
  className,
}: AudioPlayerProps) => {
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "relative flex flex-col mx-auto rounded-3xl overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm p-3 w-[280px] h-auto",
          className
        )}
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, filter: "blur(10px)" }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
          delay: 0.1,
          type: "spring",
        }}
        layout
      >
        <motion.div
          className="flex flex-col relative"
          layout
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Cover */}
          {cover && (
            <motion.div className="bg-white/20 overflow-hidden rounded-[16px] h-[110px] w-full relative">
              {cover}
            </motion.div>
          )}

          <motion.div className="flex flex-col w-full gap-y-2">
            {/* Title */}
            <motion.div className="mt-1 text-center">
              <h3 className="text-white font-bold text-base truncate">{title || "Nothing playing"}</h3>
              {subtitle && <p className="text-white/60 text-xs truncate">{subtitle}</p>}
            </motion.div>

            {/* Slider */}
            <motion.div className="flex flex-col gap-y-1">
              <CustomSlider
                value={progress}
                onChange={(v) => duration && onSeek((v / 100) * duration)}
                className="w-full"
              />
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">
                  {formatTime(currentTime)}
                </span>
                <span className="text-white text-sm">
                  {formatTime(duration)}
                </span>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div className="flex items-center justify-center w-full">
              <div className="flex items-center gap-2 w-fit bg-[#11111198] rounded-[16px] p-2">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Shuffle"
                    aria-pressed={shuffle}
                    data-hand-target=""
                    onClick={(e) => {
                      e.stopPropagation();
                      onShuffle(!shuffle);
                    }}
                    className={cn(iconBtn, shuffle && "bg-[#111111d1] text-white ring-1 ring-white/40")}
                  >
                    <Shuffle className="h-5 w-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous"
                    data-hand-target=""
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrev();
                    }}
                    className={iconBtn}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle();
                    }}
                    variant="ghost"
                    size="icon"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    data-hand-target=""
                    className={iconBtn}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next"
                    data-hand-target=""
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    className={iconBtn}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Repeat"
                    aria-pressed={repeat}
                    data-hand-target=""
                    onClick={(e) => {
                      e.stopPropagation();
                      onRepeat(!repeat);
                    }}
                    className={cn(iconBtn, repeat && "bg-[#111111d1] text-white ring-1 ring-white/40")}
                  >
                    <Repeat className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AudioPlayer;
