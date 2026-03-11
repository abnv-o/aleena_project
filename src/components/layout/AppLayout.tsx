import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  IconButton,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Waves as WavesIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { SimulationControls } from '../controls/SimulationControls';
import { EnvironmentPanel } from '../controls/EnvironmentPanel';
import { SensorPanel } from '../controls/SensorPanel';
import { PlatformPanel } from '../controls/PlatformPanel';
import { ViewportPanel } from '../controls/ViewportPanel';
import { TargetPanel } from '../controls/TargetPanel';

const DRAWER_WIDTH = 380;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%)',
        }}
      >
        <Toolbar variant="dense">
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={() => setDrawerOpen(!drawerOpen)}
            edge="start"
            sx={{ mr: 2 }}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <WavesIcon sx={{ mr: 1, color: '#4fc3f7' }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              letterSpacing: '0.5px',
              background: 'linear-gradient(90deg, #4fc3f7 0%, #81d4fa 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Underwater Sonar Simulation Platform
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            Menu left · Space: start/stop
          </Typography>

          {/* Simulation Controls in AppBar */}
          <SimulationControls />
        </Toolbar>
      </AppBar>

      {/* Side Drawer - overlay so main content keeps full width when open */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0d1a2d 0%, #0a1420 100%)',
            borderRight: '1px solid #1a3a5a',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
      >
        <Toolbar variant="dense" sx={{ flexShrink: 0 }} />

        {/* Environment: always visible at top */}
        <Box
          sx={{
            flexShrink: 0,
            borderBottom: 1,
            borderColor: 'divider',
            maxHeight: '40vh',
            overflow: 'auto',
          }}
        >
          <Typography variant="overline" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#81d4fa', fontSize: '0.7rem' }}>
            Environment
          </Typography>
          <Box sx={{ px: 2, pb: 2 }}>
            <EnvironmentPanel />
          </Box>
        </Box>

        {/* Tabs for other panels */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: '#6b8cae',
                fontSize: '0.7rem',
                minHeight: 44,
                py: 0,
                '&.Mui-selected': {
                  color: '#4fc3f7',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4fc3f7',
              },
            }}
          >
            <Tab label="Sensors" />
            <Tab label="Platform" />
            <Tab label="Target" />
            <Tab label="View" />
          </Tabs>
        </Box>

        {/* Tab Panels - scrollable */}
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <SensorPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <PlatformPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <TargetPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <ViewportPanel />
          </TabPanel>
        </Box>
      </Drawer>

      {/* Main Content Area - no marginLeft so drawer and main share space (drawer already in flow) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Toolbar variant="dense" />
        {/* Hint when drawer is closed */}
        {!drawerOpen && (
          <Box
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'absolute',
              left: 8,
              top: 52,
              zIndex: 10,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(26, 58, 90, 0.95)',
              border: '1px solid #4fc3f7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#4fc3f7',
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: 'rgba(26, 58, 90, 1)' },
            }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
            Open menu
          </Box>
        )}
        <Box sx={{ height: 'calc(100vh - 48px)', position: 'relative' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

