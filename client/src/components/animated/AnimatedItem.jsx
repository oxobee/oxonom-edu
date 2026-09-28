import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * AnimatedItem component inspired by shadcndashboard
 * Animates elements sequentially when scrolling or mounting
 */
export const AnimatedItem = ({
  children,
  index = 0,
  delay = 0,
  stagger = 0.06,
  yOffset = 20,
  className = '',
  ...props
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, scale: 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: yOffset, scale: 0.98 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1.0], // smooth cubic-bezier
        delay: index * stagger + delay,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedItem;
