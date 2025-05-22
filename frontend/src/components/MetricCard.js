import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat, Info } from '@mui/icons-material';

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  status = 'neutral',
  icon,
  tooltip,
  size = 'medium',
  onClick
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" fontSize="small" />;
      case 'down':
        return <TrendingDown color="error" fontSize="small" />;
      default:
        return <TrendingFlat color="disabled" fontSize="small" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'success';
      case 'down': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return '#48BB78';
      case 'good': return '#4299E1';
      case 'warning': return '#ED8936';
      case 'risk': return '#F56565';
      case 'primary': return '#FF6B35';
      default: return '#718096';
    }
  };

  const getValueFontSize = () => {
    switch (size) {
      case 'large': return '2.5rem';
      case 'small': return '1.5rem';
      default: return '2rem';
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${getStatusColor()}08 0%, transparent 100%)`,
        borderLeft: `4px solid ${getStatusColor()}`,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          transform: 'translateY(-2px)',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon && (
              <Box sx={{ 
                p: 1, 
                borderRadius: '8px', 
                backgroundColor: `${getStatusColor()}15`,
                color: getStatusColor(),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {icon}
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
              {title}
            </Typography>
          </Box>
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Typography 
          variant="h3"
          fontWeight={700}
          color="text.primary"
          sx={{ 
            mb: 1,
            fontSize: getValueFontSize(),
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {subtitle}
          </Typography>
        )}

        {trend && trendValue && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getTrendIcon()}
            <Chip
              label={trendValue}
              size="small"
              color={getTrendColor()}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;