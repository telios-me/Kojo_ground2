'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Share2, Wallet, Send } from 'lucide-react'

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        sendData: (data: string) => void;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string) => Promise<boolean>;
        CloudStorage: {
          getItem: (key: string) => Promise<string | null>;
          setItem: (key: string, value: string) => Promise<void>;
        };
      };
    };
  }
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

type Difficulty = 'easy' | 'medium' | 'hard'
type GameType = 'color' | 'number' | 'word' | 'candy'
type CandyType = 'red' | 'blue' | 'green' | 'yellow' | 'purple'

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: number;
}

export default function KojoGround() {
  // Shared state
  const [playerName, setPlayerName] = useState('')
  const [totalScore, setTotalScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [currentGame, setCurrentGame] = useState<GameType>('color')
  const { toast } = useToast()

  // Color game state
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 })
  const [currentColor, setCurrentColor] = useState({ r: 0, g: 0, b: 0 })
  const [colorAttempts, setColorAttempts] = useState(0)
  const [colorDifficulty, setColorDifficulty] = useState<Difficulty>('medium')

  // Number game state
  const [targetNumber, setTargetNumber] = useState(0)
  const [guessNumber, setGuessNumber] = useState('')
  const [numberAttempts, setNumberAttempts] = useState(0)
  const [numberRange, setNumberRange] = useState({ min: 1, max: 100 })

  // Word game state
  const [targetWord, setTargetWord] = useState('')
  const [scrambledWord, setScrambledWord] = useState('')
  const [guessWord, setGuessWord] = useState('')
  const [wordAttempts, setWordAttempts] = useState(0)

  // Candy Crush game state
  const [candyBoard, setCandyBoard] = useState<CandyType[][]>([])
  const [candyScore, setCandyScore] = useState(0)
  const boardSize = 8

  // Dating chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')

  useEffect(() => {
    const initializeTelegramApp = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        loadLeaderboard();
        setPlayerName(window.Telegram.WebApp.initDataUnsafe?.user?.username || 'Anonymous');
        
        // Set up event listeners
        const mainButtonClickHandler = () => {
          window.Telegram.WebApp.showAlert('Main button clicked!');
        };
        window.Telegram.WebApp.MainButton.onClick(mainButtonClickHandler);

        const backButtonClickHandler = () => {
          window.Telegram.WebApp.showConfirm('Are you sure you want to go back?').then((result) => {
            if (result) {
              // Perform back action
            }
          });
        };
        window.Telegram.WebApp.BackButton.onClick(backButtonClickHandler);

        // Clean up event listeners on component unmount
        return () => {
          window.Telegram.WebApp.MainButton.offClick(mainButtonClickHandler);
          window.Telegram.WebApp.BackButton.offClick(backButtonClickHandler);
        };
      } else {
        console.log('Telegram WebApp is not available. Running in standalone mode.');
        setPlayerName('Anonymous');
      }
    };

    initializeTelegramApp();
    generateTargetColor();
    generateTargetNumber();
    generateTargetWord();
    initializeCandyBoard();
  }, []);

  const loadLeaderboard = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        const data = await window.Telegram.WebApp.CloudStorage.getItem('leaderboard');
        if (data) {
          setLeaderboard(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      }
    } else {
      console.log('Leaderboard functionality is not available in standalone mode.');
    }
  };

  const updateLeaderboard = async (newScore: number) => {
    const updatedLeaderboard = [...leaderboard];
    const playerIndex = updatedLeaderboard.findIndex(entry => entry.name === playerName);

    if (playerIndex !== -1) {
      updatedLeaderboard[playerIndex].score = Math.max(updatedLeaderboard[playerIndex].score, newScore);
    } else {
      updatedLeaderboard.push({ name: playerName, score: newScore });
    }

    updatedLeaderboard.sort((a, b) => b.score - a.score);
    updatedLeaderboard.splice(10); // Keep only top 10 scores

    setLeaderboard(updatedLeaderboard);

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        await window.Telegram.WebApp.CloudStorage.setItem('leaderboard', JSON.stringify(updatedLeaderboard));
      } catch (error) {
        console.error('Error saving leaderboard:', error);
      }
    } else {
      console.log('Leaderboard update is not available in standalone mode.');
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.sendData(JSON.stringify({
          method: 'shareScore',
          score: totalScore
        }));
        const shareBonus = 50;
        setTotalScore(prev => prev + shareBonus);
        updateLeaderboard(totalScore + shareBonus);
        toast({
          title: "Shared successfully!",
          description: `You earned ${shareBonus} bonus points for sharing.`,
        });
      } catch (error) {
        console.error('Error sharing score:', error);
        toast({
          title: "Sharing failed",
          description: "Unable to share your score at this time.",
          variant: "destructive",
        });
      }
    } else {
      console.log('Sharing functionality is not available in standalone mode.');
      toast({
        title: "Sharing not available",
        description: "Sharing is only available in the Telegram app.",
        variant: "destructive",
      });
    }
  };

  const handleWalletConnect = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        const result = await window.Telegram.WebApp.sendData(JSON.stringify({ method: 'connectWallet' }));
        const parsedResult = JSON.parse(result);
        
        if (parsedResult.address) {
          setWalletAddress(parsedResult.address);
          setWalletConnected(true);
          toast({
            title: "Wallet Connected",
            description: `Your wallet (${parsedResult.address.slice(0, 6)}...${parsedResult.address.slice(-4)}) has been successfully connected!`,
          });
        } else {
          throw new Error('No wallet address received');
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        toast({
          title: "Wallet Connection Failed",
          description: "Unable to connect to your Telegram wallet. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Wallet Connection Not Available",
        description: "Wallet connection is only available in the Telegram app.",
        variant: "destructive",
      });
    }
  };

  // Color Game Functions
  const generateTargetColor = () => {
    setTargetColor({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    })
  }

  const handleColorChange = (color: 'r' | 'g' | 'b', value: number) => {
    setCurrentColor(prev => ({ ...prev, [color]: value }))
  }

  const handleColorGuess = () => {
    const distance = Math.sqrt(
      Math.pow(targetColor.r - currentColor.r, 2) +
      Math.pow(targetColor.g - currentColor.g, 2) +
      Math.pow(targetColor.b - currentColor.b, 2)
    )

    setColorAttempts(prev => prev + 1)

    const thresholds = {
      easy: 30,
      medium: 20,
      hard: 10
    }

    if (distance < thresholds[colorDifficulty]) {
      const baseScore = Math.max(0, 100 - colorAttempts * 10)
      const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2 }
      const newScore = Math.round(baseScore * difficultyMultiplier[colorDifficulty])
      setTotalScore(prev => prev + newScore)
      updateLeaderboard(totalScore + newScore)
      toast({
        title: "Congratulations!",
        description: `You guessed the color! You earned ${newScore} points.`,
      })
      generateTargetColor()
      setColorAttempts(0)
    } else {
      toast({
        title: "Not quite right",
        description: "Try adjusting your colors and guess again!",
        variant: "destructive",
      })
    }
  }

  const rgbToHex = (r: number, g: number, b: number) => 
    "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')

  // Number Game Functions
  const generateTargetNumber = () => {
    setTargetNumber(Math.floor(Math.random() * (numberRange.max - numberRange.min + 1)) + numberRange.min)
  }

  const handleNumberGuess = () => {
    const guess = parseInt(guessNumber)
    setNumberAttempts(prev => prev + 1)

    if (isNaN(guess)) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid number.",
        variant: "destructive",
      })
      return
    }

    if (guess === targetNumber) {
      const newScore = Math.max(0, 100 - numberAttempts * 10)
      setTotalScore(prev => prev + newScore)
      updateLeaderboard(totalScore + newScore)
      toast({
        title: "Congratulations!",
        description: `You guessed the number! You earned ${newScore} points.`,
      })
      generateTargetNumber()
      setNumberAttempts(0)
      setGuessNumber('')
    } else {
      toast({
        title: guess > targetNumber ? "Too high!" : "Too low!",
        description: "Try again!",
        variant: "destructive",
      })
    }
  }

  // Word Game Functions
  const generateTargetWord = () => {
    const words = ['react', 'telegram', 'javascript', 'typescript', 'blockchain', 'cryptocurrency']
    const word = words[Math.floor(Math.random() * words.length)]
    setTargetWord(word)
    setScrambledWord(word.split('').sort(() => Math.random() - 0.5).join(''))
  }

  const handleWordGuess = () => {
    setWordAttempts(prev => prev + 1)

    if (guessWord.toLowerCase() === targetWord) {
      const newScore = Math.max(0, 100 - wordAttempts * 10)
      setTotalScore(prev => prev + newScore)
      updateLeaderboard(totalScore + newScore)
      toast({
        title: "Congratulations!",
        description: `You unscrambled the word! You earned ${newScore} points.`,
      })
      generateTargetWord()
      setWordAttempts(0)
      setGuessWord('')
    } else {
      toast({
        title: "Not quite right",
        description: "Try again!",
        variant: "destructive",
      })
    }
  }

  // Candy Crush Game Functions
  const initializeCandyBoard = () => {
    const candies: CandyType[] = ['red', 'blue', 'green', 'yellow', 'purple']
    const newBoard = Array(boardSize).fill(null).map(() =>
      Array(boardSize).fill(null).map(() => candies[Math.floor(Math.random() * candies.length)])
    )
    setCandyBoard(newBoard)
  }

  const handleCandyClick = (row: number, col: number) => {
    const newBoard = [...candyBoard]
    const clickedCandy = newBoard[row][col]
    let matchCount = 0

    // Check horizontally
    let left = col
    let right = col
    while (left > 0 && newBoard[row][left - 1] === clickedCandy) left--
    while (right < boardSize - 1 && newBoard[row][right + 1] === clickedCandy) right++
    if (right - left + 1 >= 3) {
      for (let i = left; i <= right; i++) {
        newBoard[row][i] = null
        matchCount++
      }
    }

    // Check vertically
    let top = row
    let bottom = row
    while (top > 0 && newBoard[top - 1][col] === clickedCandy) top--
    while (bottom < boardSize - 1 && newBoard[bottom + 1][col] === clickedCandy) bottom++
    if (bottom - top + 1 >= 3) {
      for (let i = top; i <= bottom; i++) {
        newBoard[i][col] = null
        matchCount++
      }
    }

    // Update score and refill board
    if (matchCount > 0) {
      const newScore = matchCount * 10
      setCandyScore(prev => prev + newScore)
      setTotalScore(prev => prev + newScore)
      updateLeaderboard(totalScore + newScore)
      toast({
        title: "Match found!",
        description: `You earned ${newScore} points.`,
      })

      // Refill the board
      for (let c = 0; c < boardSize; c++) {
        let emptySpaces = 0
        for (let r = boardSize - 1; r >= 0; r--) {
          if (newBoard[r][c] === null) {
            emptySpaces++
          } else if (emptySpaces > 0) {
            newBoard[r + emptySpaces][c] = newBoard[r][c]
            newBoard[r][c] = null
          }
        }
        for (let r = 0; r < emptySpaces; r++) {
          newBoard[r][c] = ['red', 'blue', 'green', 'yellow', 'purple'][Math.floor(Math.random() * 5)] as CandyType
        }
      }
    }

    setCandyBoard(newBoard)
  }

  // Dating Chat Functions
  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const newMessage: ChatMessage = {
        sender: playerName,
        message: currentMessage.trim(),
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, newMessage]);
      setCurrentMessage('');

      // Send message to Telegram backend
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify({
          method: 'sendChatMessage',
          message: newMessage
        }));
      } else {
        console.log('Chat functionality is limited in standalone mode.');
      }

      // Simulate a response (in a real app, this would be handled by the server)
      setTimeout(() => {
        const responseMessage: ChatMessage = {
          sender: 'Bot',
          message: 'Thanks for your message! This is a simulated response.',
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, responseMessage]);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Kojo Ground</h1>
      <div className="mb-4 flex items-center space-x-4">
        <Button onClick={handleWalletConnect} disabled={walletConnected}>
          <Wallet className="mr-2 h-4 w-4" />
          {walletConnected ? 'Wallet Connected' : 'Connect Telegram Wallet'}
        </Button>
        <Button onClick={handleShare} variant="outline">
          <Share2 className="mr-2 h-4 w-4" /> Share Score
        </Button>
      </div>
      {walletConnected && (
        <p className="mb-4 text-sm text-gray-600">
          Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </p>
      )}
      <p className="text-xl font-semibold mb-4">Total Score: {totalScore}</p>

      <Tabs value={currentGame} onValueChange={(value) => setCurrentGame(value as GameType)} className="w-full max-w-3xl">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="color">Color Game</TabsTrigger>
          <TabsTrigger value="number">Number Game</TabsTrigger>
          <TabsTrigger value="word">Word Game</TabsTrigger>
          <TabsTrigger value="candy">Candy Crush</TabsTrigger>
          <TabsTrigger value="dating">Dating Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="color" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Guess the Color</h2>
            <Select onValueChange={(value: Difficulty) => setColorDifficulty(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-4">
              <div 
                className="w-20 h-20 border-2 border-gray-300" 
                style={{ backgroundColor: rgbToHex(targetColor.r, targetColor.g, targetColor.b) }}
                aria-label="Target color"
              ></div>
              <div 
                className="w-20 h-20 border-2 border-gray-300" 
                style={{ backgroundColor: rgbToHex(currentColor.r, currentColor.g, currentColor.b) }}
                aria-label="Your current color mix"
              ></div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="red-slider" className="block text-sm font-medium text-gray-700 mb-1">Red</label>
                <Slider
                  id="red-slider"
                  min={0}
                  max={255}
                  step={1}
                  value={[currentColor.r]}
                  onValueChange={(value) => handleColorChange('r', value[0])}
                />
              </div>
              <div>
                <label htmlFor="green-slider" className="block text-sm font-medium text-gray-700 mb-1">Green</label>
                <Slider
                  id="green-slider"
                  min={0}
                  max={255}
                  step={1}
                  value={[currentColor.g]}
                  onValueChange={(value) => handleColorChange('g', value[0])}
                />
              </div>
              <div>
                <label htmlFor="blue-slider" className="block text-sm font-medium text-gray-700 mb-1">Blue</label>
                <Slider
                  id="blue-slider"
                  min={0}
                  max={255}
                  step={1}
                  value={[currentColor.b]}
                  onValueChange={(value) => handleColorChange('b', value[0])}
                />
              </div>
            </div>
            <Button onClick={handleColorGuess}>Guess Color</Button>
          </div>
        </TabsContent>
        <TabsContent value="number" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Guess the Number</h2>
            <p>I'm thinking of a number between {numberRange.min} and {numberRange.max}.</p>
            <Input
              type="number"
              value={guessNumber}
              onChange={(e) => setGuessNumber(e.target.value)}
              placeholder="Enter your guess"
            />
            <Button onClick={handleNumberGuess}>Guess Number</Button>
          </div>
        </TabsContent>
        <TabsContent value="word" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Unscramble the Word</h2>
            <p className="text-2xl font-bold">{scrambledWord}</p>
            <Input
              type="text"
              value={guessWord}
              onChange={(e) => setGuessWord(e.target.value)}
              placeholder="Enter the unscrambled word"
            />
            <Button onClick={handleWordGuess}>Submit Word</Button>
          </div>
        </TabsContent>
        <TabsContent value="candy" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Candy Crush</h2>
            <p>Score: {candyScore}</p>
            <div className="grid grid-cols-8 gap-1">
              {candyBoard.map((row, rowIndex) =>
                row.map((candy, colIndex) => (
                  <Button
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-8 h-8 ${
                      candy === 'red' ? 'bg-red-500' :
                      candy === 'blue' ? 'bg-blue-500' :
                      candy === 'green' ? 'bg-green-500' :
                      candy === 'yellow' ? 'bg-yellow-500' :
                      'bg-purple-500'
                    }`}
                    onClick={() => handleCandyClick(rowIndex, colIndex)}
                  />
                ))
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="dating" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Dating Chat</h2>
            <div className="h-80 overflow-y-auto border border-gray-300 rounded p-4 bg-white">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`mb-2 ${msg.sender === playerName ? 'text-right' : 'text-left'}`}>
                  <span className="font-bold">{msg.sender}: </span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="text-right">{entry.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
