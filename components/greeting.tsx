import { motion } from "framer-motion";
import { AppIcon } from "./icons";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-12 flex size-full max-w-3xl flex-col items-center justify-center px-4 text-center md:mt-24 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/25 to-amber-500/25 text-orange-600 ring-1 ring-orange-500/40 backdrop-blur-sm dark:from-orange-500/35 dark:to-amber-500/35 dark:text-orange-400 md:size-24"
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      >
        <AppIcon size={56} />
      </motion.div>
      
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 font-bold text-3xl md:text-5xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
          Hey there!
        </span>
      </motion.div>
      
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-lg text-muted-foreground md:text-xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        What can I help you with today?
      </motion.div>
      
      <motion.div
        animate={{ opacity: 1 }}
        className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.8 }}
      />
    </div>
  );
};
