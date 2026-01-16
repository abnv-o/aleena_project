import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';
import type { SoundSpeedProfile } from '../../types';

interface DepthProfileChartProps {
  profile: SoundSpeedProfile;
  currentDepth?: number;
  height?: number;
}

export function DepthProfileChart({
  profile,
  currentDepth,
  height = 250,
}: DepthProfileChartProps) {
  const chartData = useMemo(() => {
    return profile.layers.map((layer) => ({
      depth: layer.depth,
      speed: layer.speed,
      temperature: layer.temperature,
    }));
  }, [profile]);

  const speedRange = useMemo(() => {
    const speeds = profile.layers.map((l) => l.speed);
    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [profile]);

  return (
    <Paper
      sx={{
        p: 1.5,
        backgroundColor: 'rgba(10, 20, 40, 0.8)',
        border: '1px solid #1a3a5a',
        borderRadius: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#4fc3f7', display: 'block', mb: 1 }}
      >
        Sound Speed Profile
      </Typography>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            type="number"
            domain={speedRange}
            tick={{ fill: '#6b8cae', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
            label={{
              value: 'm/s',
              position: 'bottom',
              fill: '#6b8cae',
              fontSize: 10,
            }}
          />
          <YAxis
            type="number"
            dataKey="depth"
            reversed
            tick={{ fill: '#6b8cae', fontSize: 10 }}
            tickFormatter={(v) => `${v}m`}
            domain={[0, 'dataMax']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10, 30, 50, 0.95)',
              border: '1px solid #4fc3f7',
              borderRadius: 4,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Depth: ${v}m`}
            formatter={(value: number, name: string) => [
              name === 'speed'
                ? `${value.toFixed(1)} m/s`
                : `${value.toFixed(1)}°C`,
              name === 'speed' ? 'Sound Speed' : 'Temperature',
            ]}
          />
          <Line
            type="monotone"
            dataKey="speed"
            stroke="#4fc3f7"
            strokeWidth={2}
            dot={{ fill: '#4fc3f7', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#81d4fa' }}
          />
          {currentDepth !== undefined && (
            <ReferenceLine
              y={currentDepth}
              stroke="#ff7043"
              strokeDasharray="5 5"
              label={{
                value: 'Platform',
                fill: '#ff7043',
                fontSize: 10,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Stats */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          mt: 1,
          pt: 1,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Min
          </Typography>
          <Typography variant="body2" sx={{ color: '#4fc3f7', fontFamily: 'monospace' }}>
            {speedRange[0]} m/s
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Max
          </Typography>
          <Typography variant="body2" sx={{ color: '#4fc3f7', fontFamily: 'monospace' }}>
            {speedRange[1]} m/s
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Layers
          </Typography>
          <Typography variant="body2" sx={{ color: '#4fc3f7', fontFamily: 'monospace' }}>
            {profile.layers.length}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}


