import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Paper,
  Typography,
  Divider,
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatQuote,
  InsertLink,
  AddPhotoAlternate,
  Undo,
  Redo,
  MoreVert
} from '@mui/icons-material';

const TextEditor = () => {
  const [content, setContent] = useState([
    { type: 'paragraph', text: 'Empieza a escribir aquí...' }
  ]);
  const [selection, setSelection] = useState(null);
  const editorRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [focusedBlock, setFocusedBlock] = useState(null);

  // Manejar el enfoque de los bloques
  useEffect(() => {
    if (focusedBlock !== null && editorRef.current) {
      const elements = editorRef.current.querySelectorAll('[contenteditable]');
      if (elements[focusedBlock]) {
        elements[focusedBlock].focus();
        
        // Mover el cursor al final del texto
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(elements[focusedBlock]);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [focusedBlock]);

  const handleKeyDown = (e, index) => {
    const elements = editorRef.current?.querySelectorAll('[contenteditable]');
    if (!elements || !elements[index]) return;

    const currentElement = elements[index];
    const selection = window.getSelection();
    const cursorPosition = selection.anchorOffset;
    const textLength = currentElement.textContent.length;

    // Navegación con flechas izquierda/derecha entre bloques
    if (e.key === 'ArrowLeft' && cursorPosition === 0 && index > 0) {
      e.preventDefault();
      setFocusedBlock(index - 1);
    } 
    else if (e.key === 'ArrowRight' && cursorPosition === textLength && index < content.length - 1) {
      e.preventDefault();
      setFocusedBlock(index + 1);
    }
    // Borrado con Backspace
    else if (e.key === 'Backspace' && cursorPosition === 0 && index > 0) {
      e.preventDefault();
      const prevElement = elements[index - 1];
      const prevText = prevElement.textContent;
      const newText = prevText + currentElement.textContent;
      
      // Combinar los bloques
      const newContent = [...content];
      newContent[index - 1] = {
        ...newContent[index - 1],
        text: newText
      };
      newContent.splice(index, 1);
      setContent(newContent);
      setFocusedBlock(index - 1);
      
      // Posicionar cursor al final del texto combinado
      setTimeout(() => {
        const range = document.createRange();
        const sel = window.getSelection();
        const prevElement = editorRef.current.querySelectorAll('[contenteditable]')[index - 1];
        range.setStart(prevElement.firstChild || prevElement, prevText.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    }
    // Borrado con Delete
    else if (e.key === 'Delete' && cursorPosition === textLength && index < content.length - 1) {
      e.preventDefault();
      const nextElement = elements[index + 1];
      const nextText = nextElement.textContent;
      const newText = currentElement.textContent + nextText;
      
      // Combinar con el siguiente bloque
      const newContent = [...content];
      newContent[index] = {
        ...newContent[index],
        text: newText
      };
      newContent.splice(index + 1, 1);
      setContent(newContent);
      setFocusedBlock(index);
      
      // Posicionar cursor en la posición original
      setTimeout(() => {
        const range = document.createRange();
        const sel = window.getSelection();
        const currentElement = editorRef.current.querySelectorAll('[contenteditable]')[index];
        range.setStart(currentElement.firstChild || currentElement, cursorPosition);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    }
    // Enter para nuevos bloques
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (content[index].type === 'list-item') {
        insertNewBlock(index + 1, { type: 'list-item', text: '' });
      } else {
        insertNewBlock(index + 1, { type: 'paragraph', text: '' });
      }
      setFocusedBlock(index + 1);
    }
    // Navegación con flechas arriba/abajo
    else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setFocusedBlock(index - 1);
    }
    else if (e.key === 'ArrowDown' && index < content.length - 1) {
      e.preventDefault();
      setFocusedBlock(index + 1);
    }
    // Tab para listas
    else if (e.key === 'Tab' && content[index].type === 'list-item') {
      e.preventDefault();
      // Implementar indentación aquí si es necesario
    }
  };

  const insertNewBlock = (index, block) => {
    const newContent = [...content];
    newContent.splice(index, 0, block);
    setContent(newContent);
  };

  const toggleBlockType = (index, type) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], type };
    setContent(newContent);
    setFocusedBlock(index);
  };

  const toggleStyle = (style) => {
    document.execCommand(style, false, null);
    if (focusedBlock !== null) {
      setFocusedBlock(focusedBlock);
    }
  };

  const handleTextChange = (index, newText) => {
    const newContent = [...content];
    newContent[index].text = newText;
    setContent(newContent);
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newContent = [...content];
          newContent.splice(selection.index + 1, 0, {
            type: 'image',
            src: event.target.result
          });
          setContent(newContent);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleInsertLink = () => {
    if (selection) {
      document.execCommand('createLink', false, linkUrl);
      setLinkDialogOpen(false);
      setLinkUrl('');
      setFocusedBlock(selection.index);
    }
  };

  const handleMoreClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMoreClose = () => {
    setAnchorEl(null);
  };

  const handleBlockClick = (index) => {
    setSelection({ index });
    setFocusedBlock(index);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', my: 4 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        {/* Barra de herramientas */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 2, 
          pb: 2, 
          borderBottom: '1px solid #eee',
          '& .MuiIconButton-root': {
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }
        }}>
          <ButtonGroup size="small">
            <IconButton onClick={() => toggleStyle('bold')}><FormatBold /></IconButton>
            <IconButton onClick={() => toggleStyle('italic')}><FormatItalic /></IconButton>
            <IconButton onClick={() => toggleStyle('underline')}><FormatUnderlined /></IconButton>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <ButtonGroup size="small">
            <IconButton onClick={() => selection && toggleBlockType(selection.index, 'list-item')}>
              <FormatListBulleted />
            </IconButton>
            <IconButton onClick={() => selection && toggleBlockType(selection.index, 'numbered-item')}>
              <FormatListNumbered />
            </IconButton>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <ButtonGroup size="small">
            <IconButton onClick={() => toggleStyle('justifyLeft')}><FormatAlignLeft /></IconButton>
            <IconButton onClick={() => toggleStyle('justifyCenter')}><FormatAlignCenter /></IconButton>
            <IconButton onClick={() => toggleStyle('justifyRight')}><FormatAlignRight /></IconButton>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <ButtonGroup size="small">
            <IconButton onClick={() => selection && toggleBlockType(selection.index, 'quote')}>
              <FormatQuote />
            </IconButton>
            <IconButton onClick={() => setLinkDialogOpen(true)}>
              <InsertLink />
            </IconButton>
            <IconButton onClick={handleInsertImage}>
              <AddPhotoAlternate />
            </IconButton>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <ButtonGroup size="small">
            <IconButton onClick={() => document.execCommand('undo', false, null)}>
              <Undo />
            </IconButton>
            <IconButton onClick={() => document.execCommand('redo', false, null)}>
              <Redo />
            </IconButton>
          </ButtonGroup>

          <IconButton onClick={handleMoreClick} sx={{ ml: 'auto' }}>
            <MoreVert />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMoreClose}
          >
            <MenuItem onClick={handleMoreClose}>Tabla</MenuItem>
            <MenuItem onClick={handleMoreClose}>Comentario</MenuItem>
            <MenuItem onClick={handleMoreClose}>Encabezado</MenuItem>
          </Menu>
        </Box>

        {/* Editor de contenido */}
        <Box 
          ref={editorRef} 
          sx={{ 
            minHeight: '400px', 
            outline: 'none',
            color: 'text.primary',
            '& [contenteditable]': {
              color: 'text.primary',
              outline: 'none',
              padding: '4px',
              borderRadius: '4px',
              '&:focus': {
                backgroundColor: 'action.hover',
                outline: 'none'
              }
            }
          }}
        >
          {content.map((block, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: 1,
                pl: block.type === 'list-item' ? 2 : 0,
                position: 'relative',
                color: 'text.primary'
              }}
              onClick={() => handleBlockClick(index)}
            >
              {block.type === 'paragraph' && (
                <Typography
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextChange(index, e.target.textContent)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  sx={{ 
                    color: 'text.primary',
                    '&:focus': {
                      backgroundColor: 'action.selected',
                      outline: 'none'
                    }
                  }}
                >
                  {block.text}
                </Typography>
              )}

              {block.type === 'list-item' && (
                <List sx={{ py: 0 }}>
                  <ListItem sx={{ py: 0, pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: '24px', color: 'text.primary' }}>•</ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleTextChange(index, e.target.textContent)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          sx={{ 
                            color: 'text.primary',
                            '&:focus': {
                              backgroundColor: 'action.selected',
                              outline: 'none'
                            }
                          }}
                        >
                          {block.text}
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              )}

              {block.type === 'numbered-item' && (
                <List sx={{ py: 0 }}>
                  <ListItem sx={{ py: 0, pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: '24px', color: 'text.primary' }}>{index + 1}.</ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleTextChange(index, e.target.textContent)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          sx={{ 
                            color: 'text.primary',
                            '&:focus': {
                              backgroundColor: 'action.selected',
                              outline: 'none'
                            }
                          }}
                        >
                          {block.text}
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              )}

              {block.type === 'quote' && (
                <Box
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextChange(index, e.target.textContent)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  sx={{ 
                    borderLeft: '3px solid #ccc',
                    pl: 2,
                    fontStyle: 'italic',
                    color: 'text.primary',
                    outline: 'none',
                    '&:focus': { 
                      backgroundColor: 'action.hover',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {block.text}
                </Box>
              )}

              {block.type === 'image' && (
                <Box sx={{ my: 2 }}>
                  <img 
                    src={block.src} 
                    alt="Inserted content" 
                    style={{ maxWidth: '100%', borderRadius: '4px' }} 
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Diálogo para insertar enlace */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)}>
        <DialogTitle>Insertar enlace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL del enlace"
            type="url"
            fullWidth
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleInsertLink}>Insertar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TextEditor;