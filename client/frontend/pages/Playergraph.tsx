import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Rollingstrip from '@/components/Rollingstrip';
import { PinContainer } from './../components/ui/3d-pin';

interface AreaGraphData {
  time: number;
  value: number;
  color: string;
}

interface Player {
  firstName: string;
  lastName: string;
  value: number;
  quantity: number;
  imageUrl: string;
  nationality: string;
  role: string;
  playerName: string;
}

interface PlayerStats {
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
}

const PlayerGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [areaGraphData, setAreaGraphData] = useState<AreaGraphData[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decrementAmount, setDecrementAmount] = useState<number>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const response = await axios.get(`https://cricktrade-server.azurewebsites.net/api/player/getPlayer/${id}`);
        setPlayer(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch player data');
        setLoading(false);
      }
    };

    fetchPlayer();

    const socket = new WebSocket('wss://aptosarena.onrender.com');
    socket.onopen = () => {
      socket.send(JSON.stringify({ playerId: id }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.playerId === id) {
        const currentValue = message.currentValue;
        const now = new Date().getTime();

        setAreaGraphData((prevData) => {
          const updatedData = [...prevData];
          const lastValue = prevData.length > 0 ? prevData[prevData.length - 1].value : currentValue;

          const color = currentValue >= lastValue ? '#00ff00' : '#ff0000';
          updatedData.push({
            time: now,
            value: currentValue,
            color,
          });

          return updatedData;
        });

        // Update the player's value in real-time
        setPlayer((prevPlayer) => {
          if (prevPlayer) {
            return { ...prevPlayer, value: currentValue };  // Update only the value property
          }
          return prevPlayer;
        });

        // Update player stats (optional, depending on WebSocket message)
        setStats(message.stats);
      }
    };

    return () => {
      socket.close();
    };
  }, [id]);

  const handleBuy = async () => {
    const privateKey = localStorage.getItem('privateKey');
    const publicKey = localStorage.getItem('publicKey');
    let amount = player?.value || 0;
    amount = Math.round(amount);
    if (!privateKey || !publicKey) {
      alert('Please log in to purchase');
      return;
    }

    try {
      const response = await axios.post('https://cricktrade-server.azurewebsites.net/api/purchase/buy-player', {
        privateKey,
        publicKey,
        amount,
        playerId: id,
        decrementAmount
      });

      alert(`Transaction successful! Hash: ${response.data.transactionHash}`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error during purchase:', error);
      alert('Failed to process the purchase');
    }
  };

  const roundNumbers = (value: number) => {
    return Math.round(value * 100) / 100
  }

  const totalValue = (quantity: number, amount: number) => {
    const finalAmount = roundNumbers(quantity * amount);
    return finalAmount;
  }

  const options = {
    chart: {
      type: 'area',
      backgroundColor: '#181818',
    },
    title: {
      text: `Player Value Over Time (${player?.firstName || 'Loading...'} ${player?.lastName || ''})`,
      style: { color: '#ffffff', fontWeight: 'bold', fontSize: '20px' },
    },
    yAxis: {
      title: {
        text: 'Value',
        style: { color: '#ffffff', fontSize: '14px' },
      },
      gridLineColor: '#444',
      labels: {
        style: {
          color: '#ffffff',
        },
      },
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          color: '#ffffff',
        },
        formatter: function (): string {
          const date = new Date((this as any).value);
          return date.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }
      },
      title: {
        text: 'Time',
        style: { color: '#ffffff', fontSize: '14px' },
      },
    },
    tooltip: {
      shared: true,
      style: {
        color: '#99999',
      },
      formatter: function (this: Highcharts.TooltipFormatterContextObject): string {
        const point = this.points ? this.points[0] : { x: 0, y: 0 };
        const date = new Date(point.x ?? 0);
        const formattedDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        return `<b>${formattedDate}</b><br/>Value: ${Highcharts.numberFormat(point.y ?? 0, 2)} APT`;
      }
    },
    plotOptions: {
      area: {
        fillOpacity: 0.5,
        marker: {
          enabled: false,
        },
        threshold: null,
      },
    },
    series: [
      {
        name: 'Player Value',
        data: areaGraphData.map(({ time, value }) => [time, value]),
        color: '#1e90ff',
        zones: areaGraphData.map(({ value, color }) => ({
          value: value,
          color: color,
        })),
        fillColor: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, 'rgba(0, 255, 0, 0.5)'],
            [1, 'rgba(255, 0, 0, 0.5)'],
          ],
        },
      },
    ],
  };

  return (
    <>
      <Navbar />
      <Rollingstrip />
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white w-full">
        <div className="w-full max-w-6xl p-10 rounded-lg bg-gray-800 shadow-xl">
          {loading ? (
            <div className="text-2xl font-medium">Loading player data...</div>
          ) : error ? (
            <div className="text-2xl text-red-500 font-semibold">{error}</div>
          ) : (
            <div className="flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8">
              {/* Left Side - Player Card */}
              <div className="flex-shrink-0">
                <PinContainer title={`${player?.firstName} ${player?.lastName}`}>
                  <div className="flex flex-col items-center p-8 bg-gray-900 border border-gray-700 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 w-[22rem] h-auto">
                    <img
                      src={player?.imageUrl}
                      alt={player?.playerName}
                      className="rounded-full h-28 w-28 mb-4 object-cover border-4 border-gray-700"
                    />
                    <h3 className="font-semibold text-3xl text-center text-white mb-4">
                      {player?.firstName} {player?.lastName}
                    </h3>
                    <div className="text-md text-center text-gray-300 mb-4 space-y-2">
                      <p className="font-medium">
                        Nationality: <span className="text-white">{player?.nationality}</span>
                      </p>
                      <p className="font-medium">
                        Role: <span className="text-white">{player?.role}</span>
                      </p>
                      <p className="font-medium">
                        Value: <span className="text-white">{roundNumbers(player?.value ?? 0)} APT</span>
                      </p>
                    </div>
                  </div>
                </PinContainer>

                {/* Input for Decrement Amount */}
                <div className="mb-4 mt-16">
                  <label className="block text-white mb-2 font-semibold">Quantity</label>
                  <input
                    type="number"
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white w-full"
                    value={decrementAmount}
                    onChange={(e) => setDecrementAmount(Number(e.target.value))}
                  />
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors duration-300"
                >
                  Buy Player
                </button>

                {/* Custom Dialog */}
                {isDialogOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full">
                      <h2 className="text-2xl font-bold mb-4">Confirm Purchase</h2>
                      <div className="mb-4 flex flex-col">
                        <span className='text-lg font-semibold'>Player Name : {player?.firstName} {player?.lastName}</span>
                        <span className='mt-2'>Value : {roundNumbers(player?.value ?? 0)} APT</span>
                        <span>Quantity : {decrementAmount}</span>
                        <span>Total amount : {totalValue(decrementAmount, player?.value ?? 0)} APT</span>
                      </div>
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setIsDialogOpen(false)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors duration-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBuy}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-300"
                        >
                          Confirm Purchase
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Graph */}
              <div className='w-full'>
                <div className="flex-1">
                  <div className="bg-gray-700 rounded-lg p-6 shadow-lg">
                    <HighchartsReact highcharts={Highcharts} options={options} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-10">
                  {[
                    { label: 'Runs', value: stats?.runs || 0 },
                    { label: 'Balls Faced', value: stats?.ballsFaced || 0 },
                    { label: 'Wickets', value: stats?.wickets || 0 },
                    { label: 'Overs Bowled', value: stats?.oversBowled || 0 },
                  ].map((stat, index) => (
                    <div key={index} className="p-6 bg-gray-700 rounded-lg shadow-lg">
                      <h3 className="text-lg font-medium mb-2">{stat.label}</h3>
                      <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PlayerGraph;