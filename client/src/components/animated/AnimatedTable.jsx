import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const wrapperVariants = {
  hidden: { opacity: 0, scale: 0.99 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const tableBodyVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const AnimatedTableWrapper = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      variants={wrapperVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedTableBody = ({ children, className = '', ...props }) => {
  return (
    <motion.tbody
      variants={tableBodyVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.tbody>
  );
};

export const AnimatedTableRow = ({
  children,
  className = '',
  index = 0,
  onClick,
  ...props
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' });

  return (
    <motion.tr
      ref={ref}
      variants={tableRowVariants}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      transition={{
        duration: 0.35,
        ease: 'easeOut',
        delay: Math.min(index * 0.04, 0.4),
      }}
      whileHover={onClick ? { backgroundColor: 'rgba(255, 255, 255, 0.03)' } : undefined}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </motion.tr>
  );
};

export default {
  AnimatedTableWrapper,
  AnimatedTableBody,
  AnimatedTableRow,
};
