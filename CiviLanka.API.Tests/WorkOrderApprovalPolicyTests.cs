using System.Collections.Generic;
using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using CiviLanka.API.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class WorkOrderApprovalPolicyTests
    {
        private IConfiguration CreateConfig(decimal threshold = 100000m)
        {
            var inMemorySettings = new Dictionary<string, string>
            {
                { "WorkOrderSettings:DirectorApprovalThreshold", threshold.ToString() }
            };
            return new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings!)
                .Build();
        }

        [Fact]
        public void TestA_Cost25k_GalleRoad_RequiresApproval_ArterialRoadRisk()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var hazard = new Hazard
            {
                Address = "124 Galle Road, Colombo 03",
                Description = "Pothole on southbound lane"
            };

            var eval = policy.Evaluate(25000m, hazard: hazard);

            Assert.True(eval.RequiresDirectorApproval);
            Assert.True(eval.IsHighRiskArterialRoad);
            Assert.False(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.ArterialRoadRisk, eval.Reason);
            Assert.Equal(WorkOrderStatus.PendingApproval, eval.InitialStatus);
            Assert.Equal(ApprovalStatus.Pending, eval.InitialApprovalStatus);
        }

        [Fact]
        public void TestB_Cost250k_ResidentialRoad_RequiresApproval_ThresholdExceeded()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var hazard = new Hazard
            {
                Address = "45 Lake Drive, Colombo 07",
                Description = "Drainage blockage on residential lane"
            };

            var eval = policy.Evaluate(250000m, hazard: hazard);

            Assert.True(eval.RequiresDirectorApproval);
            Assert.False(eval.IsHighRiskArterialRoad);
            Assert.True(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.ThresholdExceeded, eval.Reason);
            Assert.Equal(WorkOrderStatus.PendingApproval, eval.InitialStatus);
            Assert.Equal(ApprovalStatus.Pending, eval.InitialApprovalStatus);
        }

        [Fact]
        public void TestC_Cost250k_GalleRoad_RequiresApproval_Both()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var hazard = new Hazard
            {
                Address = "500 Galle Rd, Wellawatte",
                Description = "Major culvert collapse"
            };

            var eval = policy.Evaluate(250000m, hazard: hazard);

            Assert.True(eval.RequiresDirectorApproval);
            Assert.True(eval.IsHighRiskArterialRoad);
            Assert.True(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.Both, eval.Reason);
            Assert.Equal(WorkOrderStatus.PendingApproval, eval.InitialStatus);
            Assert.Equal(ApprovalStatus.Pending, eval.InitialApprovalStatus);
        }

        [Fact]
        public void TestD_Cost40k_TempleLane_DoesNotRequireApproval_None()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var hazard = new Hazard
            {
                Address = "12 Temple Lane, Colombo 03",
                Description = "Small sidewalk crack"
            };

            var eval = policy.Evaluate(40000m, hazard: hazard);

            Assert.False(eval.RequiresDirectorApproval);
            Assert.False(eval.IsHighRiskArterialRoad);
            Assert.False(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.None, eval.Reason);
            Assert.Equal(WorkOrderStatus.AiGenerated, eval.InitialStatus);
            Assert.Equal(ApprovalStatus.NotRequired, eval.InitialApprovalStatus);
        }

        [Theory]
        [InlineData("galle road")]
        [InlineData("GALLE RD")]
        [InlineData("kandy road")]
        [InlineData("KANDY RD")]
        [InlineData("high level road")]
        [InlineData("Baseline Rd")]
        [InlineData("duplication road")]
        [InlineData("Negombo Road")]
        [InlineData("Major arterial highway segment")]
        public void TestE_CaseInsensitiveArterialMatching(string locationText)
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var asset = new InfrastructureAsset
            {
                Name = "Segment A",
                Location = locationText
            };

            var eval = policy.Evaluate(10000m, asset: asset);

            Assert.True(eval.RequiresDirectorApproval);
            Assert.True(eval.IsHighRiskArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.ArterialRoadRisk, eval.Reason);
        }

        [Fact]
        public void TestF_NullOrMissingLocations_DoNotThrowExceptions()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));

            // Completely null parameters
            var evalNull = policy.Evaluate(50000m, hazard: null, asset: null, title: null, description: null);
            Assert.False(evalNull.RequiresDirectorApproval);
            Assert.False(evalNull.IsHighRiskArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.None, evalNull.Reason);

            // Hazard and Asset with null fields
            var emptyHazard = new Hazard { Address = null!, Description = null! };
            var emptyAsset = new InfrastructureAsset { Location = null!, Name = null! };
            var evalEmpty = policy.Evaluate(50000m, hazard: emptyHazard, asset: emptyAsset, title: "", description: "");
            Assert.False(evalEmpty.RequiresDirectorApproval);
            Assert.False(evalEmpty.IsHighRiskArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.None, evalEmpty.Reason);
        }

        [Fact]
        public void BoundaryCheck_ExactlyAtThreshold_DoesNotRequireApproval()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var eval = policy.Evaluate(100000m, title: "Side street work");

            Assert.False(eval.RequiresDirectorApproval);
            Assert.False(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.None, eval.Reason);
        }

        [Fact]
        public void BoundaryCheck_OneCentOverThreshold_RequiresApproval()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            var eval = policy.Evaluate(100000.01m, title: "Side street work");

            Assert.True(eval.RequiresDirectorApproval);
            Assert.True(eval.IsThresholdExceeded);
            Assert.Equal(WorkOrderApprovalReason.ThresholdExceeded, eval.Reason);
        }

        [Fact]
        public void WordBoundary_DoesNotFalsePositiveOnSubstrings()
        {
            var policy = new WorkOrderApprovalPolicy(CreateConfig(100000m));
            // "Material" contains "aterial" but should NOT match "Arterial"
            var eval = policy.Evaluate(50000m, title: "Raw Material Delivery to site", description: "Asphalt material supplies");

            Assert.False(eval.RequiresDirectorApproval);
            Assert.False(eval.IsHighRiskArterialRoad);
            Assert.Equal(WorkOrderApprovalReason.None, eval.Reason);
        }
    }
}
