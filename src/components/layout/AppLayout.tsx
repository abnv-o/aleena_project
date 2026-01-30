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

const DRAWER_WIDTH = 360;

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
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
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

          {/* Simulation Controls in AppBar */}
          <SimulationControls />
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0d1a2d 0%, #0a1420 100%)',
            borderRight: '1px solid #1a3a5a',
          },
        }}
      >
        <Toolbar variant="dense" />
        
        {/* Tabs for different panels */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: '#6b8cae',
                fontSize: '0.75rem',
                minHeight: 48,
                '&.Mui-selected': {
                  color: '#4fc3f7',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4fc3f7',
              },
            }}
          >
            <Tab label="Environment" />
            <Tab label="Sensors" />
            <Tab label="Platform" />
            <Tab label="View" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <EnvironmentPanel />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SensorPanel />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <PlatformPanel />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <ViewportPanel />
        </TabPanel>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'hidden',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
        }}
      >
        <Toolbar variant="dense" />
        <Box sx={{ height: 'calc(100vh - 48px)', position: 'relative' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

