import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Chip,
  Divider,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useState } from 'react';
import { useTargetStore } from '../../store';
import type { Target } from '../../types';

const getTargetTypeColor = (type: Target['type']): string => {
  switch (type) {
    case 'submarine':
      return '#ff4444';
    case 'surface_vessel':
      return '#4444ff';
    case 'biological':
      return '#44ff44';
    case 'mine':
      return '#ffff44';
    case 'debris':
      return '#ff8844';
    default:
      return '#ffffff';
  }
};

export function TargetPanel() {
  const { targets, addTarget, removeTarget, updateTarget, resetTargets } = useTargetStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'submarine' as Target['type'],
    x: 800,
    y: 800,
    z: -100,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
  });

  const handleOpenDialog = (target?: Target) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        name: target.name,
        type: target.type,
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
        vx: target.velocity.x,
        vy: target.velocity.y,
        vz: target.velocity.z,
        heading: target.heading,
      });
    } else {
      setEditingTarget(null);
      setFormData({
        name: '',
        type: 'submarine',
        x: 800,
        y: 800,
        z: -100,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTarget(null);
  };

  const handleSave = () => {
    const target: Target = {
      id: editingTarget?.id || `target-${Date.now()}`,
      name: formData.name || `Target ${targets.size + 1}`,
      type: formData.type,
      position: { x: formData.x, y: formData.y, z: formData.z },
      velocity: { x: formData.vx, y: formData.vy, z: formData.vz },
      heading: formData.heading,
      targetStrength: editingTarget?.targetStrength || 25,
      noiseLevel: editingTarget?.noiseLevel || 120,
      size: editingTarget?.size || { x: 100, y: 10, z: 10 },
    };

    if (editingTarget) {
      updateTarget(editingTarget.id, target);
    } else {
      addTarget(target);
    }
    handleCloseDialog();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: '#81d4fa' }}>
          Targets ({targets.size})
        </Typography>
        <Box>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ mr: 1 }}
            variant="outlined"
          >
            Add
          </Button>
          <Button size="small" onClick={resetTargets} variant="outlined">
            Reset
          </Button>
        </Box>
      </Box>

      <List dense>
        {Array.from(targets.values()).map((target) => (
          <Paper
            key={target.id}
            sx={{
              mb: 1,
              p: 1,
              backgroundColor: 'rgba(10, 30, 50, 0.5)',
              border: '1px solid rgba(79, 195, 247, 0.2)',
            }}
          >
            <ListItem disablePadding>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{target.name}</Typography>
                    <Chip
                      label={target.type}
                      size="small"
                      sx={{
                        backgroundColor: getTargetTypeColor(target.type),
                        color: '#000',
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    Pos: ({target.position.x.toFixed(0)}, {target.position.y.toFixed(0)},{' '}
                    {target.position.z.toFixed(0)}) | Speed: {Math.sqrt(
                      target.velocity.x ** 2 +
                      target.velocity.y ** 2 +
                      target.velocity.z ** 2
                    ).toFixed(1)} m/s
                  </Typography>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleOpenDialog(target)}
                  sx={{ color: '#4fc3f7', mr: 0.5 }}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => removeTarget(target.id)}
                  sx={{ color: '#ff4444' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
        {targets.size === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No targets. Click "Add" to create one.
          </Typography>
        )}
      </List>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#81d4fa' }}>
          {editingTarget ? 'Edit Target' : 'Add Target'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as Target['type'] })
                }
                size="small"
              >
                <MenuItem value="submarine">Submarine</MenuItem>
                <MenuItem value="surface_vessel">Surface Vessel</MenuItem>
                <MenuItem value="biological">Biological</MenuItem>
                <MenuItem value="mine">Mine</MenuItem>
                <MenuItem value="debris">Debris</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="X (m)"
                type="number"
                value={formData.x}
                onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) || 0 })}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Y (m)"
                type="number"
                value={formData.y}
                onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) || 0 })}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Z (m)"
                type="number"
                value={formData.z}
                onChange={(e) => setFormData({ ...formData, z: parseFloat(e.target.value) || 0 })}
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Vx (m/s)"
                type="number"
                value={formData.vx}
                onChange={(e) =>
                  setFormData({ ...formData, vx: parseFloat(e.target.value) || 0 })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Vy (m/s)"
                type="number"
                value={formData.vy}
                onChange={(e) =>
                  setFormData({ ...formData, vy: parseFloat(e.target.value) || 0 })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Vz (m/s)"
                type="number"
                value={formData.vz}
                onChange={(e) =>
                  setFormData({ ...formData, vz: parseFloat(e.target.value) || 0 })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Heading (deg)"
                type="number"
                value={formData.heading}
                onChange={(e) =>
                  setFormData({ ...formData, heading: parseFloat(e.target.value) || 0 })
                }
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTarget ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


