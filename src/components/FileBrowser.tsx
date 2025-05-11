
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Folder, File, ArrowLeft, ArrowRight } from "lucide-react";

interface FileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (filePath: string) => void;
}

const FileBrowser = ({ isOpen, onClose, onSelect }: FileBrowserProps) => {
  const [currentPath, setCurrentPath] = useState('/videos');
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);
  
  // Mock directory structure - in a real app, this would come from a backend
  const fileSystem = {
    '/videos': [
      { name: 'nature', type: 'folder', path: '/videos/nature' },
      { name: 'sports', type: 'folder', path: '/videos/sports' },
      { name: 'intro.mp4', type: 'file', path: '/videos/intro.mp4' },
      { name: 'outro.mp4', type: 'file', path: '/videos/outro.mp4' },
    ],
    '/videos/nature': [
      { name: 'mountains.mp4', type: 'file', path: '/videos/nature/mountains.mp4' },
      { name: 'ocean.mp4', type: 'file', path: '/videos/nature/ocean.mp4' },
      { name: 'forest.mp4', type: 'file', path: '/videos/nature/forest.mp4' },
    ],
    '/videos/sports': [
      { name: 'football', type: 'folder', path: '/videos/sports/football' },
      { name: 'basketball', type: 'folder', path: '/videos/sports/basketball' },
      { name: 'highlights.mp4', type: 'file', path: '/videos/sports/highlights.mp4' },
    ],
    '/videos/sports/football': [
      { name: 'match1.mp4', type: 'file', path: '/videos/sports/football/match1.mp4' },
      { name: 'match2.mp4', type: 'file', path: '/videos/sports/football/match2.mp4' },
    ],
    '/videos/sports/basketball': [
      { name: 'game1.mp4', type: 'file', path: '/videos/sports/basketball/game1.mp4' },
      { name: 'game2.mp4', type: 'file', path: '/videos/sports/basketball/game2.mp4' },
    ],
  };
  
  const getCurrentItems = () => {
    return fileSystem[currentPath as keyof typeof fileSystem] || [];
  };
  
  const navigateToFolder = (path: string) => {
    setHistory([...history, currentPath]);
    setForwardHistory([]);
    setCurrentPath(path);
  };
  
  const navigateBack = () => {
    if (history.length === 0) return;
    
    const previousPath = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setForwardHistory([currentPath, ...forwardHistory]);
    setHistory(newHistory);
    setCurrentPath(previousPath);
  };
  
  const navigateForward = () => {
    if (forwardHistory.length === 0) return;
    
    const nextPath = forwardHistory[0];
    const newForwardHistory = forwardHistory.slice(1);
    
    setHistory([...history, currentPath]);
    setForwardHistory(newForwardHistory);
    setCurrentPath(nextPath);
  };
  
  const handleSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#222532] text-white border-[#2A2F3C] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Browse Files</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={navigateBack} 
              disabled={history.length === 0}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={navigateForward} 
              disabled={forwardHistory.length === 0}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm bg-[#1A1F2C] px-2 py-1 rounded flex-grow mx-2 overflow-x-auto whitespace-nowrap">
            {currentPath}
          </div>
        </div>
        
        <div className="bg-[#1A1F2C] rounded-md h-64 overflow-y-auto p-2">
          {getCurrentItems().length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Empty folder
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {getCurrentItems().map((item) => (
                <div 
                  key={item.path}
                  className="bg-[#222532] p-2 rounded flex items-center space-x-2 cursor-pointer hover:bg-[#2A2F3C]"
                  onClick={() => item.type === 'folder' ? navigateToFolder(item.path) : handleSelect(item.path)}
                >
                  {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-blue-400" />
                  ) : (
                    <File className="h-4 w-4 text-green-400" />
                  )}
                  <span className="text-sm truncate">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileBrowser;
