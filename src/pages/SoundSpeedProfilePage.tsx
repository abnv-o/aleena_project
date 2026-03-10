import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { DepthProfileChart } from '../components/visualization';
import { useEnvironmentStore, usePlatformStore } from '../store';

export function SoundSpeedProfilePage() {
  const soundSpeedProfile = useEnvironmentStore((state) => state.environment.soundSpeedProfile);
  const platformDepth = usePlatformStore((state) => state.platform.depth);

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" sx={{ color: '#81d4fa', mb: 1 }}>
        Sound Speed Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sound speed vs depth from environment. Adjust in the Environment panel.
      </Typography>
      <DepthProfileChart
        profile={soundSpeedProfile}
        currentDepth={platformDepth}
        height={400}
      />
      <Box sx={{ mt: 2 }}>
        <Link
          to="/"
          style={{
            fontSize: 14,
            color: '#4fc3f7',
            textDecoration: 'none',
          }}
        >
          ← Back to simulation
        </Link>
      </Box>
    </Box>
  );
}
