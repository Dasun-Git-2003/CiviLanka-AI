using System.Threading.Tasks;

namespace CiviLanka.API.AI.Interfaces
{
    public interface IAIAgent<TInput, TOutput>
    {
        string AgentName { get; }
        Task<TOutput> ExecuteAsync(TInput input);
    }
}
